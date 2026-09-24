"""Read-only, explicitly owner-scoped library asset. Never discover personal files."""

import base64
import json
import struct

from sqlalchemy import select

from .errors import DomainError
from .models import MediaObject

MAX_MODEL_BYTES = 96 * 1024 * 1024


def normalize_glb(encoded):
    try:
        raw = base64.b64decode(encoded.split(",", 1)[-1], validate=True)
    except (ValueError, TypeError, AttributeError):
        raise DomainError("invalid_model", "GLB dosyası okunamadı.") from None
    return validate_glb(raw)


def validate_glb(raw):
    """Accept a bounded, self-contained GLB; never fetch referenced URLs."""
    try:
        if not 20 <= len(raw) <= MAX_MODEL_BYTES:
            raise ValueError("size")
        magic, version, length, json_length, kind = struct.unpack("<IIIII", raw[:20])
        if (magic, version, length, kind) != (0x46546C67, 2, len(raw), 0x4E4F534A):
            raise ValueError("header")
        if json_length % 4 or json_length > min(len(raw) - 20, 4 * 1024 * 1024):
            raise ValueError("chunk")
        document = json.loads(raw[20 : 20 + json_length])
        if document.get("asset", {}).get("version") != "2.0":
            raise ValueError("version")
        pending = [(document, 0)]
        count = 0
        while pending:
            value, depth = pending.pop()
            count += 1
            if depth > 64 or count > 100_000:
                raise ValueError("complexity")
            if isinstance(value, dict):
                if "uri" in value:
                    raise ValueError("external asset")
                pending.extend((v, depth + 1) for v in value.values())
            elif isinstance(value, list):
                pending.extend((v, depth + 1) for v in value)
        offset = 20 + json_length
        if offset < len(raw):
            size, chunk_type = struct.unpack("<II", raw[offset : offset + 8])
            if chunk_type != 0x004E4942 or size % 4 or offset + 8 + size != len(raw):
                raise ValueError("binary chunk")
        return raw
    except (ValueError, TypeError, AttributeError, struct.error, RecursionError):
        raise DomainError(
            "invalid_model", "En fazla 96 MB, tüm geometrisi ve dokuları içinde bulunan GLB 2.0 dosyası seç."
        ) from None


def stored_model(database, athlete_id, metadata_only=False):
    with database.sessions() as db:
        query = (
            select(MediaObject)
            .where(
                MediaObject.athlete_id == athlete_id,
                MediaObject.mime == "model/gltf-binary",
                MediaObject.deleted_at.is_(None),
            )
            .order_by(MediaObject.updated_at.desc(), MediaObject.id)
            .limit(1)
        )
        if metadata_only:
            from sqlalchemy.orm import defer
            query = query.options(defer(MediaObject.content)).execution_options(alos_media_metadata=True)
        row = db.scalar(query)
        if not row:
            return None
        if metadata_only:
            return {"id": str(row.id), "name": row.name, "bytes": (row.details or {}).get("bytes")}
        return {"id": str(row.id), "content": row.content, "name": row.name}


def resolve_model(settings, athlete_id):
    if settings.body_model_owner_id != athlete_id or settings.body_model_path is None:
        return None
    path = settings.body_model_path.resolve()
    try:
        size = path.stat().st_size
        if path.suffix.lower() != ".glb" or not 20 <= size <= 128 * 1024 * 1024:
            raise ValueError("size or suffix")
        with path.open("rb") as stream:
            magic, version, length = struct.unpack("<III", stream.read(12))
        if magic != 0x46546C67 or version != 2 or length != size:
            raise ValueError("header")
    except (OSError, ValueError, struct.error):
        raise DomainError(
            "model_unavailable",
            "3B kütüphane modeli açılamadı. Kayıtlarını ve 2B haritayı kullanmaya devam edebilirsin.",
            503,
        ) from None
    return path
