"""Account actions use reauthentication and never enter the offline health journal."""

import re
from secrets import token_urlsafe
from uuid import UUID

from pydantic import Field, field_validator
from sqlalchemy import delete, select

from .auth import passwords, rate_limit, token_hash
from .contracts import StrictModel
from .db import Base, utcnow
from .errors import DomainError
from .models import Athlete, AuthSession, RecoveryCode, SecurityAudit, User


class AccountPatch(StrictModel):
    expected_version: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=254)

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        if not v:
            return None
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", v):
            raise ValueError("Geçerli e-posta adresi gir.")
        return v.strip()


class PasswordChange(StrictModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class Reauthenticate(StrictModel):
    password: str = Field(min_length=1, max_length=128)


class Recover(StrictModel):
    username: str = Field(min_length=3, max_length=40)
    recovery_code: str = Field(min_length=15, max_length=100)
    new_password: str = Field(min_length=8, max_length=128)


def verify(user, password):
    if user is None:
        raise DomainError("login_required", "Oturum artık geçerli değil.", 401)
    if not passwords.verify(password, user.password_hash):
        raise DomainError("password", "Mevcut şifreni kontrol et.", 403)


def locked_account(db, identity):
    user = db.get(User, UUID(identity["id"]), with_for_update=True)
    session = db.get(AuthSession, identity["session_hash"], with_for_update=True)
    if (
        not user
        or not session
        or session.user_id != user.id
        or session.auth_epoch != user.auth_epoch
        or session.expires_at <= utcnow()
    ):
        raise DomainError("login_required", "Oturum artık geçerli değil.", 401)
    return user, session


def edit(database, identity, data):
    with database.sessions.begin() as db:
        user, _ = locked_account(db, identity)
        if user.version != data.expected_version:
            raise DomainError(
                "version_conflict", "Hesap başka bir yerde değişti. Yenileyip tekrar dene.", 409
            )
        user.name = data.name.strip()
        user.email = data.email
        user.version += 1
        db.add(SecurityAudit(user_id=user.id, event="profile_updated"))
    return {"updated": True, "email_verified": False}


def change_password(database, identity, data):
    rate_limit(database, "reauth:" + identity["id"], 10)
    with database.sessions.begin() as db:
        user, session = locked_account(db, identity)
        verify(user, data.current_password)
        user.password_hash = passwords.hash(data.new_password)
        user.auth_epoch += 1
        user.version += 1
        session.auth_epoch = user.auth_epoch
        db.execute(
            delete(AuthSession).where(
                AuthSession.user_id == user.id, AuthSession.token_hash != identity["session_hash"]
            )
        )
        db.add(SecurityAudit(user_id=user.id, event="password_changed"))
    return {"changed": True, "other_sessions_revoked": True}


def recovery_codes(database, identity, data):
    rate_limit(database, "reauth:" + identity["id"], 10)
    codes = [token_urlsafe(18) for _ in range(8)]
    with database.sessions.begin() as db:
        user, _ = locked_account(db, identity)
        verify(user, data.password)
        db.execute(delete(RecoveryCode).where(RecoveryCode.user_id == user.id))
        db.add_all(RecoveryCode(user_id=user.id, code_hash=token_hash(code)) for code in codes)
        db.add(SecurityAudit(user_id=user.id, event="recovery_codes_rotated"))
    return {"codes": codes, "notice": "Yalnız bir kez gösterilir. Yeni kodlar önceki kodları iptal etti."}


def recover(database, data):
    rate_limit(database, "recover:" + data.username.casefold(), 5)
    with database.sessions.begin() as db:
        user = db.scalar(
            select(User).where(User.username == data.username.strip().casefold()).with_for_update()
        )
        code = db.scalar(select(RecoveryCode).where(RecoveryCode.code_hash == token_hash(data.recovery_code)))
        if not user or not code or code.user_id != user.id or code.used_at:
            raise DomainError("recovery", "Kullanıcı adı veya kurtarma kodu yanlış.", 401)
        code.used_at = utcnow()
        user.password_hash = passwords.hash(data.new_password)
        user.auth_epoch += 1
        user.version += 1
        db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
        db.add(SecurityAudit(user_id=user.id, event="account_recovered"))
    return {"recovered": True, "login_required": True}


def erase(database, identity, data):
    rate_limit(database, "reauth:" + identity["id"], 10)
    with database.sessions.begin() as db:
        # Domain writers use the same athlete lock. Waiting writes see no athlete after deletion.
        athlete = db.get(Athlete, UUID(identity["athlete_id"]), with_for_update=True)
        user, _ = locked_account(db, identity)
        verify(user, data.password)
        for table in reversed(Base.metadata.sorted_tables):
            if table.name in ("users", "athletes"):
                continue
            if "athlete_id" in table.c:
                db.execute(table.delete().where(table.c.athlete_id == athlete.id))
            elif "user_id" in table.c:
                db.execute(table.delete().where(table.c.user_id == user.id))
        db.delete(athlete)
        db.flush()
        db.delete(user)
    return {
        "deleted": True,
        "retention": "Aktif veritabanından silindi. Daha önce indirdiğin dosyalar ve sağlayıcı yedekleri ayrıca kendi saklama sürelerine tabidir.",
    }
