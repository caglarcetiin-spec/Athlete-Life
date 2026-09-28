"""Browser-only synthetic EVREN substitute. Never starts against a personal database."""

import os

from alos import ai_planning as ai
from alos.config import Settings
from alos.main import create_app
from pydantic import SecretStr


def create():
    name = os.environ["ALOS_SYNTHETIC_SPORT_DB"]
    if (
        not name.startswith("alos_test_sport_browser_")
        or os.environ.get("PYTHON_DOTENV_DISABLED") != "1"
    ):
        raise RuntimeError("Synthetic fixture only")

    def response(settings, context):
        return ai.AIPlan.model_validate(
            {
                "summary": "Sentetik branş planı; gerçek sağlayıcı çağrısı yapılmadı.",
                "limitations": ["Temel teknik kataloğu; eğitmenle düzenlenir."],
                "days": [
                    {
                        "weekday": d["weekday"],
                        "exercises": [
                            {**e, "reason": "Sentetik branş ve ortam eşleşmesi."}
                            for e in d["exercises"]
                        ],
                    }
                    for d in context["reference_draft"]
                ],
            }
        )

    ai.call_provider = response
    return create_app(
        Settings(
            database_url="postgresql://localhost:15432/" + name,
            public_origin="http://127.0.0.1:10011",
            enabled=True,
            environment="test",
            ai_provider="evren",
            evren_model="synthetic-model",
            evren_api_key=SecretStr("synthetic-not-a-real-key"),
        )
    )
