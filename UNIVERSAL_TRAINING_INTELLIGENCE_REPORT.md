# Athlete Life OS v7.14 — Universal Training Intelligence Report

## Goal

All performed training must enter one shared physiological analysis mesh regardless of how it was logged:

- planned Coach session
- Guided Workout Runner
- manual training entry
- substituted movement
- partial session
- Ad Hoc / free session

The exact movement performed remains the source of truth. A substituted Ring Dip never creates fake Ring Row stimulus.

## Movement-specific routing

Every curated movement is automatically routed to one of these models:

1. `static_isometric`
   - Front Lever, Planche, Back Lever and other static holds.
   - Uses hold seconds, hold distribution, rest, RIR and movement strength/skill/stability profile.

2. `loaded_dynamic`
   - Weighted Pull-Up, DB Hammer Curl, RDL, OHP, weighted lower-body/accessory work.
   - Uses load, repetitions, set count, RIR, rest, relative external load and movement profile.

3. `explosive_skill`
   - Muscle-Up and other high-power/high-skill dynamic movements.
   - Uses repetitions, rest quality, RIR/RPE, power and skill profile.

4. `bodyweight_dynamic`
   - Ring Row, Push-Up, Bodyweight Squat and similar dynamic bodyweight work.
   - Uses reps, RIR, rest/density and movement profile.

5. `sprint`
   - Sprint / Hill Sprint.
   - Uses bout seconds, rounds, rest, session RPE and optional distance.

6. `interval`
   - Intervals / VO2 intervals.
   - Uses work seconds, work:rest, accumulated duration and RPE.

7. `continuous_aerobic`
   - Zone 2 / Tempo / Threshold / Long Run.
   - Uses time or distance, RPE and running mode.

8. `mobility_recovery`
   - Mobility / low-cost recovery work.

## Common output contract

Every model returns the same common fields so all downstream engines can read it:

- muscle stimulus
- mechanical demand
- metabolic demand
- neural demand
- skill demand
- cardiovascular demand
- stability demand
- joint-load profile
- local muscle recovery cost
- global recovery cost
- ATP-PCr / glycolytic / aerobic demand indices
- strength / hypertrophy / power / skill / work-capacity adaptation indices
- confidence

These are decision-support indices, not measured biological percentages.

## Cross-engine data flow

`trainingLogs`
→ `AthleteLoadMesh`
→ Muscle Stimulus / 3D Body Map
→ Recovery
→ Science Trend
→ Coach systemic penalty
→ Nutrition load context
→ Adaptive goal-conflict engine
→ Athlete Identity training-exposure context
→ Analytics Universal Training Mesh

`AthleteLoadMesh.rolling()` now reads ALL real training rows, not only Ad Hoc sessions.

## Load Prescription Engine

Coach prescriptions now include load when the movement requires an external load.

Priority:

1. same-movement personal history
2. capability/character anchor
3. explicit template anchor
4. conservative bodyweight/profile baseline

Examples at a 72 kg bodyweight with no same-movement history:

- DB Hammer Curl 2×10–15 → approximately **8 kg / dumbbell** starting recommendation.
- If 8 kg is completed at 15/15 with RIR 2, next recommendation → **10 kg / dumbbell**.
- Weighted Pull-Up template anchor `+35 kg` remains a higher-priority personalized program anchor.

Readiness can reduce the recommendation, and Pain Intelligence can suppress it.

## Persistence

Manual, Adaptive and Guided set writes receive a `physiologySnapshot`.
Session completion re-stamps the day after final duration and session-RPE are known.
Record Manager mutations re-stamp affected training data.

## Verification

Automated validation in v7.14 includes:

- all 70 curated movement records produce a valid physiological model and finite common demand outputs
- every weighted movement currently present in the Coach templates has a load-prescription profile
- DB Hammer Curl baseline and history-based progression tests
- Front Lever / Weighted Pull-Up / Muscle-Up / Ring Row / Sprint / Zone 2 / Mobility model routing tests
- all-session rolling mesh test
- physiology snapshot test
- JavaScript syntax validation across all affected engines

## Limits

The system does not claim exact:
- lactate
- VO2
- calories
- ATP-PCr percentage
- tendon force
- joint force
- injury probability
- 1RM without an appropriate performance test

The mesh is a transparent coaching and load-management system built from the athlete's recorded training plus movement-specific heuristics.
