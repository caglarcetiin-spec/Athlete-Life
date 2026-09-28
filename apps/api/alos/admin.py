"""Separate administrator authorization; never serialize credentials or auth tokens."""

from uuid import UUID

from pydantic import Field
from sqlalchemy import delete, select

from . import account, auth, service
from .contracts import StrictModel
from .errors import DomainError
from .models import Administrator, Athlete, AuthSession, MediaObject, SecurityAudit, User
from .mongo_db import retry_transaction


class Action(StrictModel):
    password: str = Field(min_length=1, max_length=128)
    confirm_username: str = Field(min_length=3, max_length=40)


def is_admin(database, user_id):
    with database.snapshot() as db:
        return db.get(Administrator, UUID(str(user_id))) is not None


def require(db, identity):
    user, session = account.locked_account(db, identity)
    if not db.get(Administrator, user.id):
        raise DomainError("admin_required", "Bu alan yalnız yönetici hesabına açıktır.", 403)
    return user, session


def summary(user, admin=False):
    return {
        "id": str(user.id),
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
        "is_admin": admin,
    }


def users(database, identity, page=0):
    with database.sessions.begin() as db:
        require(db, identity)
        rows = list(db.scalars(select(User).order_by(User.created_at, User.id).offset(page * 50).limit(51)))
        return {
            "users": [summary(user, db.get(Administrator, user.id) is not None) for user in rows[:50]],
            "page": page,
            "has_more": len(rows) > 50,
        }


def detail(database, identity, target_id):
    with database.sessions.begin() as db:
        operator, _ = require(db, identity)
        target = db.get(User, target_id)
        if not target:
            raise DomainError("not_found", "Hesap bulunamadı.", 404)
        athlete = db.scalar(select(Athlete).where(Athlete.user_id == target_id))
        result = summary(target, db.get(Administrator, target_id) is not None)
        db.add(SecurityAudit(user_id=operator.id, event="admin_view:" + str(target_id)))
        athlete_id = athlete.id
    # Standard domain serializer includes records and media metadata, not account secrets.
    return {"account": result, "records": service.bootstrap(database, athlete_id)}


@retry_transaction
def action(database, identity, target_id, data, operation):
    auth.rate_limit(database, "admin-reauth:" + identity["id"], 10)
    with database.sessions.begin() as db:
        operator, _ = require(db, identity)
        account.verify(operator, data.password)
        athlete = db.scalar(select(Athlete).where(Athlete.user_id == target_id).with_for_update())
        target = db.get(User, target_id, with_for_update=True)
        if not target:
            raise DomainError("not_found", "Hesap bulunamadı.", 404)
        if target.id == operator.id or db.get(Administrator, target.id):
            raise DomainError("admin_protected", "Yönetici hesapları bu işlemden korunur.", 409)
        if data.confirm_username != target.username:
            raise DomainError("confirmation", "İşlem için hedef kullanıcı adını aynen yaz.", 422)
        if operation == "delete":
            account.erase_records(db, target, athlete)
        elif operation == "revoke":
            target.auth_epoch += 1
            target.version += 1
            db.execute(delete(AuthSession).where(AuthSession.user_id == target_id))
        else:
            raise DomainError("operation", "Desteklenmeyen yönetici işlemi.")
        db.add(SecurityAudit(user_id=operator.id, event="admin_" + operation + ":" + str(target_id)))
    return {"completed": True, "operation": operation}


def media(database, identity, target_id, media_id):
    with database.sessions.begin() as db:
        operator, _ = require(db, identity)
        athlete = db.scalar(select(Athlete).where(Athlete.user_id == target_id))
        row = db.get(MediaObject, media_id)
        if not athlete or not row or row.athlete_id != athlete.id or row.deleted_at:
            raise DomainError("not_found", "Medya bulunamadı.", 404)
        db.add(SecurityAudit(user_id=operator.id, event="admin_media:" + str(target_id)))
        return row.content, row.mime


def audit(database, identity):
    with database.sessions.begin() as db:
        require(db, identity)
        rows = db.scalars(
            select(SecurityAudit)
            .where(SecurityAudit.user_id == UUID(identity["id"]))
            .order_by(SecurityAudit.created_at.desc())
            .limit(100)
        )
        return {"events": [{"event": r.event, "created_at": r.created_at.isoformat()} for r in rows]}
