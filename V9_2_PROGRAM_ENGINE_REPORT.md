# Athlete Life OS v9.2 — Unified Program Engine

## What changed

- One authority now owns the weekly training prescription: `AthleteProgramEngine v9.2`.
- Stable weekly microcycle: Monday Pull + Front Lever, Tuesday Run, Wednesday Push + Planche, Thursday Recovery, Friday Legs + Hybrid, Saturday Run, Sunday Recovery.
- Shift/work schedule changes the recommended training time, not the identity of the session.
- Daily readiness, recovery, pain and health data primarily change dose: volume, intensity/load, RIR/rest and recovery emphasis.
- Automatic day movement is reserved for hard constraints (very low measured readiness, health recovery/stop state, or major pain conflict), and only moves the session into a nearby recovery slot. The deferral is persisted so repeated refreshes do not reshuffle the week.
- The 12-week macrocycle now modulates training dose: base/hypertrophy, planned deload, strength + mass, performance, realization/test.
- SportsSciencePolicy v9.2 audits exercise suitability but does not silently reorder or replace the programmed exercise sequence.
- Guided Workout Runner v9.2 refreshes the unified Program Engine before starting today/future sessions, then materializes the Canonical Session prescription.
- Service worker cache and script query versions were bumped to v9.2 to prevent stale planner code from remaining active in the PWA/browser cache.

## Invariants

1. Weekly card, selected-day workout and Guided Runner read the same canonical prescription.
2. A started session remains immutable for that target date.
3. Ordinary readiness fluctuations cannot randomly turn Tuesday Run into Legs/Pull/Push.
4. Exercise continuity is preserved unless an explicit safety/health substitution is required.
5. Historical logs remain dated data and are not overwritten by future-plan recalculation.

## Verification

All JavaScript regression/integration tests and `launch.test.py` pass, including the new `v9_2_program_engine.test.js`.
