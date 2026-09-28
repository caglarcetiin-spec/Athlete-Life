"""Short-lived registration proof; no account or password exists before verification."""

import hashlib
import hmac
import json
import re
from datetime import timedelta
from secrets import randbelow, token_urlsafe
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

from pydantic import Field, field_validator
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError

from . import auth
from .ai_planning import NoRedirect
from .contracts import StrictModel
from .db import utcnow
from .errors import DomainError
from .models import EmailChallenge
from .mongo_db import retry_transaction


class EmailRequest(StrictModel):
    email: str = Field(max_length=254)

    @field_validator("email")
    @classmethod
    def email_address(cls, value):
        value = value.strip().casefold()
        if not re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", value):
            raise ValueError("Geçerli e-posta adresi gir.")
        return value


def available(settings):
    return bool(settings.resend_api_key and settings.email_from and settings.email_code_secret)


def digest(settings, challenge, email, code):
    return hmac.new(
        settings.email_code_secret.get_secret_value().encode(),
        f"{challenge}:{email}:{code}".encode(),
        hashlib.sha256,
    ).hexdigest()


def deliver(settings, email, code):
    body = {
        "from": settings.email_from,
        "to": [email],
        "subject": "Athlete Life kayıt doğrulama kodun",
        "text": f"Athlete Life doğrulama kodun: {code}\nKod 10 dakika geçerlidir. Bu işlemi sen başlatmadıysan mesajı yok say.",
        "reply_to": settings.support_email,
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + settings.resend_api_key.get_secret_value(),
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with build_opener(NoRedirect()).open(request, timeout=15) as response:
            if response.status not in (200, 201, 202):
                raise ValueError("delivery")
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        raise DomainError(
            "email_delivery", "Kod e-postası gönderilemedi. Biraz sonra yeniden dene.", 503
        ) from None


def issue(database, settings, data, ip):
    if not settings.registration_enabled:
        raise DomainError("registration_closed", "Yeni kayıt şu anda kapalı.", 403)
    if not available(settings):
        raise DomainError(
            "email_unconfigured",
            "E-posta doğrulama hizmeti henüz bağlanmadı. Yeni kayıt şu anda açılamıyor.",
            503,
        )
    auth.rate_limit(database, "email-global", 100)
    auth.rate_limit(database, "email-ip:" + ip, 10)
    auth.rate_limit(database, "email-address:" + data.email, 3)
    challenge, code = token_urlsafe(32), f"{randbelow(1000000):06d}"
    now = utcnow()
    with database.sessions.begin() as db:
        db.execute(delete(EmailChallenge).where(EmailChallenge.expires_at < now))
        db.execute(delete(EmailChallenge).where(EmailChallenge.email == data.email))
        db.add(
            EmailChallenge(
                id=challenge,
                email=data.email,
                code_hash=digest(settings, challenge, data.email, code),
                attempts=0,
                expires_at=now + timedelta(minutes=10),
            )
        )
    try:
        deliver(settings, data.email, code)
    except DomainError:
        with database.sessions.begin() as db:
            db.execute(delete(EmailChallenge).where(EmailChallenge.id == challenge))
        raise
    return {
        "challenge_id": challenge,
        "expires_in": 600,
        "message": "Doğrulama kodu e-posta hizmetine iletildi. Gelen kutunu ve spam klasörünü kontrol et.",
    }


@retry_transaction
def complete(database, settings, body):
    if not available(settings):
        raise DomainError("email_unconfigured", "E-posta doğrulama hizmeti henüz bağlanmadı.", 503)
    email = EmailRequest(email=body.email or "").email
    invalid = False
    try:
        with database.sessions.begin() as db:
            challenge = db.get(EmailChallenge, body.challenge_id or "", with_for_update=True)
            if (
                not challenge
                or challenge.email != email
                or challenge.expires_at <= utcnow()
                or challenge.attempts >= 5
            ):
                invalid = True
            else:
                challenge.attempts += 1
                if not hmac.compare_digest(
                    challenge.code_hash, digest(settings, challenge.id, email, body.code or "")
                ):
                    invalid = True
                else:
                    user, _ = auth.create_user(db, body.username, body.name, body.password)
                    user.email = email
                    db.delete(challenge)
    except IntegrityError:
        raise DomainError("account_unavailable", "Bu kullanıcı adı kullanılamıyor.", 409) from None
    if invalid:
        raise DomainError(
            "email_code", "Kod yanlış, süresi dolmuş veya deneme sınırına ulaşılmış. Yeni kod iste.", 422
        )
    return {"created": True, "registration_email_verified": True}


@retry_transaction
def cleanup(database):
    """Worker cleanup also applies to PostgreSQL; Mongo has an expiry TTL index."""
    from sqlalchemy import select

    with database.snapshot() as db:
        if db.scalar(select(EmailChallenge).where(EmailChallenge.expires_at < utcnow()).limit(1)) is None:
            return
    with database.sessions.begin() as db:
        db.execute(delete(EmailChallenge).where(EmailChallenge.expires_at < utcnow()))
