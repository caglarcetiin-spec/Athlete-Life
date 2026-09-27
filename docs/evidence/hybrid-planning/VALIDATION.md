# Hybrid planner validation

Baseline: b79ef20; working tree hashes and full command/environment/stdout/exit codes are captured in ../stage-9/hybrid-*.json and .log.

First regression run: hybrid-baseline, 23 passed / 1 failed. The existing equipment test expected barbell squats solely from owning a bar and rack. New explicit competency gating intentionally rejects that inference. Update that fixture to declare squat competency; add a separate assertion that advanced experience alone cannot unlock advanced movements. No failure is hidden or test removed.

All fixtures are synthetic; temporary local PostgreSQL/Mongo databases only. User preview database is not a test fixture.

Final checks: hybrid-api 49 passed; hybrid-client 20 passed; hybrid-mongo 2 passed on local replica set; hybrid-browser PASS (10-step mobile flow, draft reload, five-point limit, preview/read-only, editable canonical draft, explicit activation, Health muscle panel/nutrition link). Preview has zero Axe violations and no horizontal overflow at 360/390/768/1280px. Build, ESLint and Ruff pass. Existing large-chunk warning and dependency deprecation warnings remain. No clinical validation or physical-device keyboard test claimed.
