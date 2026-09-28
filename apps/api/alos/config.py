from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ALOS_V2_", env_file=None, extra="ignore", hide_input_in_errors=True
    )

    ai_provider: Literal["openai", "evren"] = "openai"
    evren_api_key: SecretStr | None = Field(default=None, repr=False)
    evren_model: str = Field(default="", max_length=100, pattern=r"^[A-Za-z0-9._:/-]*$")
    evren_reasoning_effort: Literal["none", "minimal", "low", "medium", "high", "xhigh"] | None = None
    openai_api_key: SecretStr | None = Field(default=None, repr=False)
    openai_model: str = Field(default="", max_length=100, pattern=r"^[A-Za-z0-9._:-]*$")
    ai_user_limit: int = Field(default=3, ge=1, le=20)
    ai_global_limit: int = Field(default=20, ge=1, le=1000)

    resend_api_key: SecretStr | None = Field(default=None, repr=False)
    email_code_secret: SecretStr | None = Field(default=None, repr=False, min_length=32)
    email_from: str = Field(default="", max_length=254)
    support_email: str = "caglar.cetiin@outlook.com"
    evren_chat_model: str = Field(default="", max_length=100, pattern=r"^[A-Za-z0-9._:/-]*$")
    evren_chat_vision: bool = False

    body_model_path: Path | None = None
    body_model_owner_id: UUID | None = None
    mongo_database: str | None = None
    enabled: bool = False
    worker_enabled: bool = True
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(repr=False)
    public_origin: str = "http://127.0.0.1:10005"
    registration_enabled: bool = False
    session_hours: int = 24 * 14
    static_dir: Path = Path(__file__).resolve().parents[2] / "web" / "dist"
    max_body_bytes: int = 16 * 1024 * 1024
    cookie_name: str = "alos_v2_session"

    @field_validator("database_url")
    @classmethod
    def supported_database(cls, value: str) -> str:
        if not value.startswith(("postgresql://", "postgresql+psycopg://", "mongodb://", "mongodb+srv://")):
            raise ValueError(
                "MongoDB veya PostgreSQL bağlantısı gerekli; otomatik başka veritabanına geçilmez."
            )
        return value.replace("postgresql://", "postgresql+psycopg://", 1)

    @model_validator(mode="after")
    def validate_deployment(self):
        if self.database_url.startswith(("mongodb://", "mongodb+srv://")) and not self.mongo_database:
            raise ValueError("MongoDB veritabanı adı açıkça yapılandırılmalı.")
        if bool(self.body_model_path) != bool(self.body_model_owner_id):
            raise ValueError("3B kütüphane dosyası ve sahip kimliği birlikte yapılandırılmalı.")
        origin = urlsplit(self.public_origin)
        if (
            origin.scheme not in ("http", "https")
            or not origin.hostname
            or origin.username
            or origin.path
            or origin.query
            or origin.fragment
        ):
            raise ValueError("Geçerli bir uygulama origin adresi gerekli.")
        if self.environment == "production" and origin.scheme != "https":
            raise ValueError("Üretim ortamında HTTPS gerekli.")
        if origin.scheme == "http" and origin.hostname not in ("127.0.0.1", "localhost", "testserver"):
            raise ValueError("HTTP yalnız yerel geliştirmede kullanılabilir.")
        if not 1 <= self.session_hours <= 24 * 30:
            raise ValueError("Oturum süresi 1 saat–30 gün olmalı.")
        return self
