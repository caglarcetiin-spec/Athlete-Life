"""Honest capability boundary: no configured external data or LLM transport."""

from typing import Literal

from pydantic import BaseModel


class IntegrationStatus(BaseModel):
    id: str
    status: Literal["disabled", "unconfigured", "native_required"]
    reads_personal_data: bool = False
    writes_records: bool = False
    explanation: str


def statuses():
    return [
        IntegrationStatus(
            id="ai_coach",
            status="disabled",
            explanation="Harici yapay zekâ sağlayıcısı bağlı değil. Kayıtlar, kurallı planlama ve raporlar bağımsız çalışır.",
        ),
        IntegrationStatus(
            id="apple_health",
            status="native_required",
            explanation="HealthKit için izinli yerel iOS uygulaması gerekir; bu web uygulaması sağlık verilerini doğrudan okumaz.",
        ),
        IntegrationStatus(
            id="wearables",
            status="unconfigured",
            explanation="Saat veya spor platformu bağlı değil. Dosyalar yalnız açık yedek içe aktarma akışından alınır.",
        ),
    ]
