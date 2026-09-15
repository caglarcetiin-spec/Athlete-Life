# Athlete Life OS v9.2.1 — System Integrity Fixture Isolation Fix

## Fixed failures
- Sprint → muscle map hamstring/glute
- Sprint → Science interference context
- Sprint → Nutrition load context
- Ad Hoc → work capacity / recovery cost

## Root cause
The integrity test reused the same sandbox `db.trainingLogs[past]` slot across several contracts. The Sprint fixture was successfully processed by AthleteLoadMesh, then overwritten with a Weighted Pull-Up fixture before the downstream muscle-map, Science, and Nutrition assertions ran. The Ad Hoc circuit fixture was likewise overwritten by a later lifecycle fixture before its work-capacity assertion.

## Resolution
- Added a dedicated immutable `adHocFixtureRows` fixture for Ad Hoc analysis.
- Kept the Sprint fixture active through rolling mesh, muscle map, Science interference, and Nutrition load assertions.
- Switched to the planned-strength fixture only after all Sprint contracts complete.
- Cleared stale ad-hoc session state before planned-strength mesh assertions.
- Bumped System Integrity report version to 9.2.1 and PWA cache to force the corrected test engine to load.

## Validation
All project JavaScript regression tests pass, plus Python launcher tests.
