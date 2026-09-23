"""Opaque, revocable sessions. No password or session token is written to logs."""

from datetime import timedelta
from hashlib import sha256
from secrets import compare_digest, token_urlsafe

from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from .db import utcnow
from .errors import DomainError
from .models import Athlete, AuthSession, LoginAttempt, User

passwords = PasswordHash.recommended()
_dummy_hash = passwords.hash(token_urlsafe(24))


def token_hash(token):
    return sha256(token.encode()).hexdigest()


def create_user(db, username, name, password):
    username = username.strip().casefold()
    if not 3 <= len(username) <= 40 or not 8 <= len(password) <= 128:
        raise DomainError("invalid_account", "Kullanıcı adı 3–40, şifre 8–128 karakter olmalı.")
    user = User(username=username, name=name, password_hash=passwords.hash(password))
    db.add(user)
    db.flush()
    athlete = Athlete(user_id=user.id)
    db.add(athlete)
    db.flush()
    return user, athlete


def rate_limit(database, key, limit=10):
    """Committed separately, so a rejected login cannot roll back its rate counter."""
    now = utcnow()
    digest = token_hash(key)
    with database.sessions.begin() as db:
        db.execute(
            insert(LoginAttempt)
            .values(key=digest, count=0, reset_at=now + timedelta(minutes=15))
            .on_conflict_do_nothing()
        )
        attempt = db.get(LoginAttempt, digest, with_for_update=True)
        if attempt.reset_at <= now:
            attempt.count, attempt.reset_at = 0, now + timedelta(minutes=15)
        attempt.count += 1
        exceeded = attempt.count > limit
    if exceeded:
        raise DomainError("rate_limited", "Çok fazla deneme. 15 dakika sonra tekrar dene.", 429)


def login(database, settings, username, password, old_token=None):
    with database.sessions.begin() as db:
        user = db.scalar(select(User).where(User.username == username.strip().casefold()))
        try:
            valid = passwords.verify(password, user.password_hash if user else _dummy_hash)
        except (ValueError, TypeError):
            valid = False
        if not valid or not user:
            raise DomainError("invalid_credentials", "Kullanıcı adı veya şifre yanlış.", 401)
        if old_token:
            db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash(old_token)))
        token, csrf = token_urlsafe(32), token_urlsafe(32)
        db.add(
            AuthSession(
                token_hash=token_hash(token),
                user_id=user.id,
                csrf=csrf,
                auth_epoch=user.auth_epoch,
                expires_at=utcnow() + timedelta(hours=settings.session_hours),
            )
        )
    return token


def identity(request, database, settings, mutation=False):
    token = request.cookies.get(settings.cookie_name, "")
    with database.sessions() as db:
        session = db.get(AuthSession, token_hash(token)) if token else None
        user = db.get(User, session.user_id) if session else None
        if not session or not user or session.expires_at <= utcnow() or session.auth_epoch != user.auth_epoch:
            raise DomainError(
                "login_required", "Oturum açmalısın. Bekleyen kayıtların cihazında korunuyor.", 401
            )
        if mutation and not compare_digest(request.headers.get("X-CSRF-Token", ""), session.csrf):
            raise DomainError("csrf", "Güvenli oturum doğrulanamadı. Sayfayı yenile.", 403)
        athlete = db.scalar(select(Athlete).where(Athlete.user_id == user.id))
        if athlete is None:
            raise DomainError("login_required", "Oturum artık geçerli değil.", 401)
        return {
            "id": str(user.id),
            "athlete_id": str(athlete.id),
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "version": user.version,
            "csrf": session.csrf,
            "session_hash": session.token_hash,
        }
