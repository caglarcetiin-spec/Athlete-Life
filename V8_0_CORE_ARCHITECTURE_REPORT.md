# Athlete Life OS v8.0 — Core Architecture Rebuild

## Purpose

v8.0 implements the ten highest-priority architectural changes identified for the Athlete OS.
This release is not primarily a UI feature release. It restructures how data, models and
recommendations communicate.

## 1. Central Event Store / Single Source of Truth migration

Added `event-store-engine.js`.

Measured events are now represented as immutable records with:
- event id
- event type
- athlete day
- domain
- source
- actor
- payload
- provenance metadata

The current application still keeps its legacy `db` object as a compatibility/materialized
projection while v8 migrates the system. Food, water, daily check-in and common training
writes are dual-written to the Event Store. Existing historical records are bootstrapped
idempotently with stable event IDs.

Food/water deletion is represented as explicit events instead of silently erasing history.

Portable backups and local checkpoints now include the Event Store.

## 2. Engine Communication Bus

Added `engine-bus.js`.

Engines register their:
- name
- version
- inputs
- outputs
- health callback

`event.appended` is routed into domain topics such as:
- `nutrition.changed`
- `training.changed`
- `recovery.changed`

Consumers can update Nutrition Impact, architecture state and model snapshots without each
engine directly reaching into every other engine.

## 3. Measured / Derived / Estimated / Recommended data separation

Added `data-lineage-engine.js`.

Every model output can carry:
- `kind`
- `confidence`
- model name
- model version
- input lineage
- units
- explanatory note

The v8 daily model snapshot stores readiness, hydration, Coach recommendation and adaptive
nutrition with explicit lineage.

## 4. Model confidence / provenance / version

Lineage objects and Event Store events contain confidence and version metadata.

This is the foundation for preventing a heuristic 0–100 index from being displayed as if it
were a directly measured physiological variable.

## 5. Adaptive Coach Constraint Solver

Added `adaptive-coach-solver.js`.

The solver separates hard constraints from soft objectives.

Hard constraints include:
- illness / health guard
- high pain + high joint-risk movement
- available session time

Soft objectives include:
- muscle gain
- Planche
- Front Lever
- running
- recent neural/mechanical load
- performance trend
- recovery cost

The existing weekly planning engine can now consume the Solver when available. Planned-session
continuity gets a strong bonus, so the solver is designed to preserve the program unless
constraints justify a change.

## 6. Personal Calibration

Added `personal-calibration-engine.js`.

The engine learns per-movement:
- average load
- average repetitions
- average RIR
- number of sessions
- calibration confidence

It also contains an observed bodyweight/intake maintenance-calibration model. It requires
enough real weight and calorie records before producing a maintenance estimate.

## 7. Performance Trend V2

Added `performance-trend-v2.js`.

Trend V2 no longer treats performance as only load or best hold.

Weighted movements can include:
- system/external load
- repetitions
- RIR
- rest context
- bodyweight

Static movements can include:
- best hold
- total quality seconds
- set decay
- RIR

It outputs rising / declining / plateau / stable with confidence.

## 8. Tissue Load Engine

Added `tissue-load-engine.js`.

This is intentionally an exposure model, not an injury probability model.

Current mapped examples include:
- wrist
- elbow
- anterior shoulder
- biceps tendon
- grip
- hamstring
- Achilles
- patellar tendon
- hip
- low back

It consumes actual training rows and the physiological recovery-cost model.

## 9. Adaptive Nutrition

Added `adaptive-nutrition-engine.js`.

Targets can now depend on:
- current bodyweight
- calibrated maintenance estimate
- weight-gain target
- planned training type
- recent metabolic load

Carbohydrate targets are periodized by training demand rather than being permanently fixed.

The daily Nutrition Advice can display the adaptive target when the engine is available.

## 10. Schema Migration + Release Integrity

Added:
- `schema-migration-engine.js`
- `release-integrity-v8.js`
- v8 Golden Journey contract test

Current app schema target: **8**

The migration pipeline creates/normalizes:
- `waterLogs`
- `modelSnapshots`
- `calibration`
- `tissueLoad`
- v8 architecture metadata

Release Integrity checks architecture availability and critical engine outputs.

## Architecture Dashboard

Analytics now contains an **Athlete OS Architecture v8.0** card showing:
- Event count
- registered engine count
- schema health
- release-integrity pass count
- Trend V2 state
- personal calibration confidence
- current Constraint Solver recommendation
- highest modeled tissue exposure

## Backup / recovery

Portable `.alosbackup` payloads and local checkpoints now include Event Store data.
On merge import, events are merged by stable event ID.
On replace import/checkpoint restore, the corresponding Event Store is restored.

## Validation

- JavaScript syntax: **62/62 PASS**
- Node test files: **20/20 PASS**
- Missing HTML script assets: **0**
- Duplicate HTML IDs: **0**
- Ten architecture priority contracts: **10/10 present**

Executed v8-specific tests include:
- Event Store idempotent legacy bootstrap
- Event deletion projector
- Engine Bus publish/subscribe
- schema 5 → 8 migration
- lineage kind/confidence
- weighted performance Trend V2
- personal load calibration
- Tissue Load projection
- Adaptive Nutrition finite targets
- Constraint Solver finite decision
- Golden Journey cross-module wiring

Existing regression tests for Nutrition, Water Ledger, Hydration, universal physiology,
load prescription, pain, substitution and Guided Workout also continue to pass.

## Important architecture boundary

v8.0 is a **migration architecture**, not a claim that every legacy read in the application
has already been removed.

The legacy `db` remains the current materialized compatibility projection while the Event
Store becomes the audit/canonical event layer. This avoids breaking the mature v7 feature
set in one destructive rewrite.

The next architectural step is to progressively replace direct legacy reads with formal
projectors/selectors from Athlete State until no engine needs to know the raw DB layout.

## Browser E2E boundary

The automated test suite validates JavaScript execution, engine contracts, data migrations,
cross-module scenarios and package structure. A fresh real-browser full click-through,
WebGL and PWA/offline-install test is not claimed in this environment.
