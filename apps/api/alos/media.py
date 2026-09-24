import base64
import hashlib
import io
import warnings
from datetime import date
from typing import Literal

from PIL import Image, UnidentifiedImageError
from pydantic import Field

from .contracts import Empty, StrictModel
from .db import utcnow
from .errors import DomainError
from .models import MediaObject
from .service import get_owned, serial


class PhotoInput(StrictModel):
    name: str = Field(min_length=1, max_length=150)
    content: str = Field(max_length=11_200_000)
    mime: Literal["image/jpeg", "model/gltf-binary"] = "image/jpeg"


class ModelUpload(StrictModel):
    name: str = Field(min_length=1, max_length=150)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class MediaDetails(StrictModel):
    captured_date: date | None = None
    view: Literal["front", "back", "side", "other", "unknown"] = "unknown"
    weight_kg: float | None = Field(default=None, gt=0, le=500, allow_inf_nan=False)
    waist_cm: float | None = Field(default=None, gt=0, le=500, allow_inf_nan=False)
    note: str = Field(default="", max_length=1000)


def normalize_photo(encoded):
    try:
        raw = base64.b64decode(encoded.split(",", 1)[-1], validate=True)
        if len(raw) > 2_000_000:
            raise ValueError("size")
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as im:
                if im.width * im.height > 12_000_000 or im.format not in ("JPEG", "PNG", "WEBP"):
                    raise ValueError("format")
                im.load()
                im = im.convert("RGB")
                im.thumbnail((960, 960))
                target = io.BytesIO()
                im.save(target, format="JPEG", quality=82, optimize=True)
                content = target.getvalue()
                if len(content) > 512_000:
                    raise ValueError("size")
                return content
    except (
        ValueError,
        TypeError,
        OSError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise DomainError(
            "invalid_image", "En fazla 2 MB, 12 megapiksel JPEG/PNG/WebP fotoğraf seç."
        ) from None


def validate_restored_media(mime, content):
    """Restore is an input boundary too. Validate without recompressing historical bytes."""
    if mime == "model/gltf-binary":
        from .body_model import validate_glb

        validate_glb(content)
        return
    if mime != "image/jpeg" or not 0 < len(content) <= 512_000:
        raise DomainError("media_type", "Yedekte desteklenmeyen medya türü veya boyutu var.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format != "JPEG" or image.width * image.height > 12_000_000:
                    raise ValueError("image")
                image.verify()
    except (ValueError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise DomainError("media_content", "Yedekteki fotoğraf içeriği doğrulanamadı.") from None


def apply_media(db, athlete, command, attachment=None):
    row = get_owned(
        db,
        MediaObject,
        athlete.id,
        command.entity_id,
        command.expected_version,
        create=command.command_type in {"media.save", "media.upload"},
    )
    before = serial(row) if row else None
    if command.command_type == "media.delete" and row:
        Empty.model_validate(command.payload)
        row.deleted_at = utcnow()
        row.version += 1
    elif command.command_type == "media.annotate" and row:
        data = MediaDetails.model_validate(command.payload)
        row.captured_date = data.captured_date
        row.details = {**(row.details or {}), **data.model_dump(exclude={"captured_date"})}
        row.version += 1
    elif command.command_type == "media.upload":
        data = ModelUpload.model_validate(command.payload)
        if attachment is None or hashlib.sha256(attachment).hexdigest() != data.sha256:
            raise DomainError("model_checksum", "Dosya bütünlüğü doğrulanamadı.")
        if row is None:
            row = MediaObject(id=command.entity_id, athlete_id=athlete.id, version=0)
            db.add(row)
        row.name, row.mime, row.content = data.name, "model/gltf-binary", attachment
        row.sha256 = data.sha256
        row.details = {"bytes": len(attachment)}
        row.version += 1
    elif command.command_type == "media.save":
        data = PhotoInput.model_validate(command.payload)
        if data.mime == "model/gltf-binary":
            from .body_model import normalize_glb

            content = normalize_glb(data.content)
        else:
            content = normalize_photo(data.content)
        if row is None:
            row = MediaObject(id=command.entity_id, athlete_id=athlete.id, version=0)
            db.add(row)
        row.name = data.name
        row.mime = data.mime
        row.content = content
        row.sha256 = hashlib.sha256(content).hexdigest()
        row.version += 1
    else:
        raise DomainError("unknown_command", "Desteklenmeyen medya işlemi.")
    row.updated_at = utcnow()
    db.flush()
    return row, before, [{"kind": "media", "entity": serial(row)}]
