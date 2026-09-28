# Running planner regression notes

Initial focused regression: 9 passed / 3 failed. Failures were fixture/API mistakes, not desired behavior: PlanningPreferences.equipment is not a supported field (use equipment_profiles + active_equipment_id); DomainError exposes str(error), not .message; pain schema uses area/intensity, not region/severity. Correct fixtures without weakening behavioral assertions.

Initial combined run `running_initial`: 59 pure tests passed, four PostgreSQL setup errors from sandbox-denied localhost:15432; rerun with localhost permission. No test expectation changes for these errors.

Version expectations change intentionally: guided-sports-4 → guided-sports-5; ai-planner-7 → ai-planner-8, matching the new running taxonomy/interval rules and performance context. Older versions stay parseable.

Full API regression initially had 414 passes / 2 failures: branch resource tests expected branch-specific guidance. The new generic no-candidate message had lost that guidance. Restored branch-specific actionable text and route to competency/environment prerequisites; kept assertions unchanged. Focused regression then passed 224 assertions with one PostgreSQL sandbox setup error; full permitted run covers that setup.

Final results:
- running_api_final: 529 passed across tests/v2 + tests/mongodb (synthetic PostgreSQL and MongoDB), exit 0. Snapshot captured before the final display-only run_form metadata addition; the subsequent final browser/persistence tests include that metadata.
- running_persistence: 15 passed (13 running behavior checks plus PostgreSQL and MongoDB preference acceptance/round trips), exit 0. This focused run overlaps the general suite; counts should not be added as unique tests.
- running_web: 27 passed; running_release_build exit 0. Build retains existing large-chunk and dependency annotation warnings; no type or build error.
- running_release_browser and running_sport_browser: PASS; synthetic provider via real AI validation endpoint, 390/1280 px, no serious/critical Axe violations or page errors.
- Ruff and scoped ESLint passed; source/diff checks passed. No live AI call or clinical validation was performed.
- PREVIEW.json: unauthenticated /health/ready returned 200 and served JS matches packaged release. Personal preview account records were not read for testing.
