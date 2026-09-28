"""Manual synthetic plan-analysis comparison. No personal data or database access."""

import argparse
import getpass
import hashlib
import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/api"))
from alos.ai_planning import NoRedirect

PROMPT = """Bir antrenman taslağını Türkçe değerlendir. Bu sentetik bir yazılım değerlendirmesidir, gerçek kişi değildir. Yalnız şu JSON'u üret: {"issues":[{"code":"equipment|competency|volume|rir|duration|balance|duplicate|unsupported_biology","evidence":"somut hata","correction":"uygulanabilir düzeltme"}],"summary":"kısa değerlendirme"}. Sadece bulduğun sorunları listele. Ölçülmemiş kas hasarı/iyileşme veya gelişim yüzdesi üretme. Kayıtları silmeyi veya otomatik değiştirmeyi önerme.
Profil: yetişkin, yeni başlıyor; ekipman sadece zemin ve vücut ağırlığı, barfiks/halter/halka yok; front lever yetkinliği bildirilmemiş. Hedef tüm vücut, ön bacak odağı. Üç antrenman günü, seans başına 30 dakika.
Uygulamanın bu profil için mühendislik kuralları (evrensel spor bilimi kuralı değildir): seans en fazla 12 kardiyo dışı set; kuvvet RIR 2–5; dinlenme en az 60 saniye; aynı hareket bir seansta tekrarlanamaz. Süre = 8 dakika hazırlık + her hareket için 60 saniye geçiş + set sayısı*tekrar*4 saniye veya set sayısı*tutuş saniyesi + (set sayısı-1)*dinlenme.
İncelenen haftanın her üç günü aynı: barbell-deadlift 5x12, RIR0, dinlenme180s; front-lever 5x30s dinlenme120s; push-up 5x20 RIR0 dinlenme120s; push-up tekrar 5x20 RIR0 dinlenme120s. Plan açıklaması: Bu plan tüm kas gruplarını dengeli geliştirir. Bu setlerden kas hasarın %40 olur ve 24 saatte kesin %100 iyileşirsin. Dört haftada %20 kas artışı garanti.
Doğru, kısa ve veriye bağlı analiz yap; yeni tanı koyma. Yanıt Türkçe olsun."""
EXPECTED = {
    "equipment",
    "competency",
    "volume",
    "rir",
    "duration",
    "balance",
    "duplicate",
    "unsupported_biology",
}


CONTROL = (
    PROMPT[: PROMPT.index("Profil:")]
    + """Profil: yetişkin yeni başlayan. Hedef sadece evde düzenli egzersiz alışkanlığı, ön bacak/kalça ve itiş. Tam vücut/çekiş kapsama iddiası yok. Ekipman zemin ve vücut ağırlığı; haftada üç gün, seans en fazla 30 dakika. Beceri hareketi istenmiyor.
Uygulama kuralları: en fazla12 kardiyo dışı set; kuvvet RIR2–5; kuvvet dinlenme en az60s; aynı hareket aynı seansta tekrarlanmaz. Süre hesabı8dk hazırlık + hareket başına60s geçiş + set*tekrar*4s veya set*tutuşs + (set-1)*dinlenme.
Her seansta farklı dört hareket: bodyweight-squat 2x10 RIR3 dinlenme60s; glute-bridge 2x10 RIR3 dinlenme60s; push-up 2x6 RIR3 dinlenme60s; plank 2x20s dinlenme60s RIR yok. Seanslar pazartesi çarşamba cuma.
Plan notu: Sadece bildirilen amaçlar için kısıtlı başlangıç taslağıdır. Çekiş/sırt kapsamı yok; tüm vücudu çalıştırdığı iddia edilmez. Beceri veya yük kapasitesi bilinmiyor, varsayılmıyor. Kesin kas gelişimi/iyileşme yüzdesi söylenemez. Gereksinim değişirse plan yeniden değerlendirilir.
Yalnız somut kural ihlali varsa issues'a yaz. İhlal yoksa boş liste döndür; genel iyileştirme seçeneklerini bir hata olarak sunma."""
)


def run(key, models):
    at = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    folder = ROOT / "docs/evidence/evren" / ("critique-" + at)
    folder.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "source_hash": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "prompts": {"flawed": PROMPT, "control": CONTROL},
        "expected": sorted(EXPECTED),
        "synthetic": True,
        "models": models,
        "scope": "fault identification under supplied constraints, not clinical expertise certification",
    }
    (folder / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )

    def one(task):
        model, case = task
        expected = EXPECTED if case == "flawed" else set()
        start = time.monotonic()
        result = {"model": model, "case": case, "result": "FAIL"}
        body = {
            "model": model,
            "messages": [
                {"role": "user", "content": PROMPT if case == "flawed" else CONTROL}
            ],
            "max_tokens": 6000,
            "reasoning_effort": "low",
            "stream": False,
        }
        req = Request(
            "https://evren-llmapi.ssyz.org.tr/v1/chat/completions",
            data=json.dumps(body).encode(),
            headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with build_opener(NoRedirect()).open(req, timeout=90) as response:
                raw = json.loads(response.read(1_000_000))
            choice = raw["choices"][0]
            if choice["finish_reason"] != "stop":
                raise ValueError("incomplete")
            content = choice["message"]["content"].strip()
            if content.startswith("```json\n") and content.endswith("\n```"):
                content = content[8:-4]
            answer = json.loads(content)
            codes = {issue["code"] for issue in answer["issues"]}
            result.update(
                result="PASS",
                answer=answer,
                identified=len(codes & expected),
                expected=len(expected),
                unexpected=sorted(codes - expected),
            )
        except Exception as exc:  # noqa: BLE001 — no provider bodies or keys in errors
            result.update(error_type=type(exc).__name__)
        result["elapsed_seconds"] = round(time.monotonic() - start, 2)
        (folder / (model + "-" + case + ".json")).write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        )
        print(
            json.dumps(
                {k: v for k, v in result.items() if k != "answer"}, ensure_ascii=False
            ),
            flush=True,
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(
            pool.map(
                one,
                [(model, case) for case in ["flawed", "control"] for model in models],
            )
        )
    print(str(folder), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("models", nargs="+")
    args = parser.parse_args()
    secret = getpass.getpass("EVREN key (hidden): ").strip()
    run(secret, args.models)
