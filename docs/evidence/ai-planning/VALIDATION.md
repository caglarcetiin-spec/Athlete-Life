# AI planning validation

All provider calls are mocked. No API key, paid OpenAI request, real user record or production database is used. Tests inspect the outbound allowlist and strict structured-response adapter; this does not prove live model quality.

First ai-api run: 55 passed, 1 failed. The privacy fixture supplied an invalid meal lacking canonical local_date, so the existing nutrition summarizer failed before payload preparation. Add the required date to this synthetic fixture; do not weaken the payload privacy assertion. Failed log is retained by run_evidence history.

Second ai-api run: same privacy fixture also lacked the canonical meal id needed by historical nutrition trends. Add synthetic id/version and date metadata to the meal/lab fixtures. The privacy assertion and application code remain unchanged; this is fixture repair, not relaxing a failed privacy check.

First ai-browser run failed because the synthetic setup refreshed immediately after its adult-confirmation checkbox change; the mocked response then used the standard health-gated empty template. Reconfirm adulthood after the synthetic provider switch/reload and assert it in the intercepted request. Add a client-side AI age/symptom gate too (the real endpoint already blocks before any provider call). No assertion about the requested front-lever movement is removed.

Final results: ai-api 57 passed (AI adapter + existing guided/hybrid/workout regression); ai-mongo 1 passed; ai-client 20 passed; ai-browser PASS with mocked provider (consent, disabled setup, provider failure, no silent fallback, read-only preview, editable draft/explicit activation and persisted ai_origin). Axe preview: no violations; no horizontal overflow at 360/390/768/1280px. Build, ESLint, Ruff pass. Known build chunk-size/dependency deprecation warnings remain. Real API access, latency/cost and model quality remain unverified until the owner supplies credentials.
