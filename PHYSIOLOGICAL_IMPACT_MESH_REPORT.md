# v7.13 Physiological Impact Mesh — Integration Report

The v7.13 mesh connects Ad Hoc movement data to the shared training-analysis stack.

## Sprint contract
A Sprint logged with per-bout seconds, rounds, inter-round rest, session RPE and optional distance creates a physiology snapshot with energy-system demand indices, neuromuscular/power demand, high-speed exposure, lower-body muscle stimulus and recovery cost.

## Cross-engine routes
- Ad Hoc Session → `trainingLogs` → Muscle Stimulus / Recovery Ledger / 3D Body Map.
- Ad Hoc Session → `AthleteLoadMesh` → Coach future-day systemic penalty.
- `AthleteLoadMesh` → Science interference context for leg muscles.
- `AthleteLoadMesh` → Nutrition Impact recent training load, carb target and hydration context.
- `AthleteLoadMesh` → Adaptive Goal Conflict sprint/recovery warning.
- `AthleteLoadMesh` → Athlete Identity exposure context, but **not** capability scores or PRs.
- Ad Hoc rows remain `planContribution:false`, so they do not falsely complete the planned workout.

## Scientific boundary
The mesh estimates relative demand, not exact internal physiology. Without GPS/HR/lactate/power, it does not claim exact peak speed, VO2, lactate, caloric expenditure, ATP-PCr percentage or injury probability.
