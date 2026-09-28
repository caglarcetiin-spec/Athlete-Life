"""Synthetic-only browser server; no delivery and no real EVREN requests."""

import io
import json
import os

from alos import ai_chat, email_registration
from alos.config import Settings
from alos.main import create_app
from pydantic import SecretStr


def create():
    name = os.environ["ALOS_SYNTHETIC_SPORT_DB"]
    if (
        not name.startswith("alos_test_sport_browser_")
        or os.environ.get("PYTHON_DOTENV_DISABLED") != "1"
    ):
        raise RuntimeError("Synthetic fixture required")
    email_registration.randbelow = lambda _: 123456
    email_registration.deliver = lambda *_: None

    class Opener:
        def open(self, request, timeout):
            payload = json.loads(request.data)
            assert payload["messages"][0]["role"] == "system"
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {
                                    "content": "Sentetik spor yanıtı: hedefin ve ekipmanın hakkında konuşabiliriz."
                                },
                            }
                        ]
                    }
                ).encode()
            )

    ai_chat.build_opener = lambda *_: Opener()
    return create_app(
        Settings(
            database_url="postgresql://localhost:15432/" + name,
            enabled=True,
            environment="test",
            public_origin="http://127.0.0.1:10011",
            registration_enabled=True,
            resend_api_key=SecretStr("synthetic"),
            email_from="noreply@example.org",
            email_code_secret=SecretStr("synthetic-email-code-secret-0123456789"),
            evren_api_key=SecretStr("synthetic"),
            evren_model="qwen3.8-flash-next",
        )
    )
