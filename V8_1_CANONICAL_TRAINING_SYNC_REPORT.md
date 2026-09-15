# Athlete Life OS v8.1 — Canonical Training Plan Synchronization

## Reported problem

The Training page could show different workouts in:

1. **Bu Haftanın Antrenman Planı**
2. **Bugünün Hazır Antrenmanı**
3. **Guided Workout Runner**

The divergence was real and had two architectural causes.

### Cause 1 — different plan readers

The weekly layer was primarily reading `futurePlans`, while today's detailed workout was
built through `resolvedTemplate()`.

Those two structures describe the same intended session at different abstraction levels,
but there was no persistent session-level prescription object binding the exact movement
list, prescriptions, loads and rest targets to one identity.

### Cause 2 — Guided Runner could become stale

Guided Workout Runner copied its own `items` snapshot when a workout was started.

If readiness, Coach optimization or a manual plan rebuild created a newer `futurePlans`
version afterwards, Weekly/Today could move to the new plan while an already active Guided
Runner continued using its older snapshot.

The old repair logic checked the Guided engine version, not the current plan prescription
identity. That allowed three screens to legitimately drift apart.

A separate case also exists by design: Session Router can intentionally target a previous
day for a late/catch-up workout. That should be shown as a **different target date**, not
silently look like a synchronization failure.

## v8.1 solution — Canonical Session Prescription

Added `canonical-session-engine.js`.

For each program date the application now owns one canonical session snapshot in:

`db.sessionPrescriptions[date]`

The snapshot contains:

- canonical `snapshotId`
- fingerprint
- plan type/name/version
- readiness/plan metadata
- exact ordered movement list
- prescription text
- load recommendation
- rest target/min/max
- pain/risk context
- health/modifier context
- lock state and lock reason

### Before execution

The prescription remains **unlocked**.

If readiness, health, Coach optimization or plan version changes, the canonical snapshot can
refresh. Weekly Plan, Today's Workout and a newly started Guided Runner will all see the new
snapshot.

### Once execution begins

The prescription becomes **locked** when:

- Guided Runner starts, or
- a manual performed exercise is recorded, or
- performed/session feedback data already exists.

After locking, the future-plan optimizer is not allowed to delete or replace that session.

This prevents an in-progress workout from changing underneath the athlete.

## Three-way consumer rule

### Weekly Plan

`renderWeeklyTrainingPlanV5()` now reads the canonical snapshot and displays a short movement
preview plus the canonical snapshot identity.

### Today's Ready Workout

`renderTodayTrainingPlanV5()` uses `canonicalTemplate(date)`.

The badge also shows plan version and `LOCK` when execution has started.

### Guided Workout Runner

`planItems(target)` now consumes `CanonicalSessionEngine.template(target)`.

When Runner starts:

1. it receives the canonical movement list,
2. the canonical session is locked,
3. the runner stores `canonicalSnapshotId`,
4. all generated training rows carry that canonical snapshot ID.

Guided integrity now reports:

- `CANONICAL OK`, or
- `PLAN SYNC HATASI`.

## Existing active Guided sessions

v8.1 does not discard an already active workout created by an older version.

If an unfinished Guided Runner already exists, its actual movement prescription is adopted as
the locked canonical snapshot.

Weekly Plan and Today's Workout therefore move to the active runner's real started session,
instead of silently replacing the workout mid-session.

## Optimizer behavior

`buildFuturePlanV5()` now treats a locked session as a hard scheduling constraint.

A locked date:

- is not deleted during re-optimization,
- is counted toward the week's scheduled session requirement,
- is removed from candidate dates for a replacement workout.

Future unlocked days can still be optimized normally.

## Adherence / Coach consistency

Plan adherence fallback now uses canonical movement names rather than rebuilding a generic
template from only the plan type.

Adaptation context and Coach workout rendering also use the canonical session metadata.

## Session Router distinction

The Session Router now exposes the canonical snapshot ID.

If Guided Runner is deliberately pointed at another date, the UI explicitly says that the
Runner is executing a catch-up/other-date plan.

That is considered an intentional target-date difference, not a three-way synchronization
failure.

## New Training sync indicator

The Training page now contains a synchronization strip.

Normal same-day state:

**3/3 SYNC**

It verifies:

`Weekly Plan → Today's Ready Workout → Guided Runner`

against the same canonical prescription.

If an active Runner targets a different date, it shows:

**TELAFİ HEDEFİ**

and explains which date the Runner belongs to.

## Persistence / schema

Schema target is now **9**.

Migration step 9 creates:

`sessionPrescriptions`

and marks:

`sessionArchitecture = "canonical-prescription-v1"`

Because the canonical prescription store is inside the main application DB, it is included in
the existing Data Vault backup/checkpoint payloads.

## Regression protection

New tests cover:

- unlocked canonical prescription follows a new plan version
- locked prescription does not drift after a new plan is generated
- existing Guided session can be adopted as canonical
- Guided / Today / Weekly use the same movement sequence
- Guided start locks the prescription
- optimizer cannot delete a locked date
- Session Router is canonical-aware
- schema migration 5 → 9
- Service Worker includes canonical engine

## Validation

- JavaScript syntax: **65/65 PASS**
- Node test files: **22/22 PASS**
- Missing HTML script assets: **0**
- Duplicate HTML IDs: **0**
- v8.1 canonical contracts: **10/10 PASS**

Existing regression tests for physiology, load prescription, hydration, nutrition,
Guided Workout core, substitution, pain, Water Ledger and v8 architecture continue to pass.

## Runtime boundary

This build validates engine logic, migration, canonical locking, cross-module wiring,
JavaScript syntax and package integrity.

A fresh real-browser mouse/touch click-through, WebGL and offline-PWA installation test is
not claimed in this environment.
