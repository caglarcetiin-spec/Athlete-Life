# Athlete Life OS v7.17 — Daily Nutrition UI Runtime Fix

## Exact root cause

The daily Nutrition page buttons were rendered correctly, but `nutrition-record-engine.js`
looked for:

- `window.db`
- `window.FOODS`

The main app defines those as:

- `let db = ...`
- `const FOODS = ...`

Top-level `let` / `const` bindings in classic browser scripts are shared global lexical
bindings, but they are **not properties on `window`**.

Therefore:
- adding food worked because `app.js` directly used lexical `db`
- delete/edit buttons called a separate engine that saw `window.db === undefined`
- the UI action silently returned without changing the daily ledger

## Fix

v7.17 adds `window.ALOSRuntime`, a controlled bridge with getters:

- `getDb()`
- `getFoods()`
- `save()`
- `renderNutrition()`
- `renderAnalytics()`
- `renderReports()`

The Nutrition Record Editor now exclusively uses the bridge.

A getter is used instead of copying `db` onto `window`, so if another engine temporarily
reassigns the lexical database reference (for example System Integrity sandbox tests),
the editor still receives the current database.

## Regression test

The automated test intentionally leaves BOTH of these undefined:

- `window.db`
- `window.FOODS`

It supplies the real data only through `ALOSRuntime`, reproducing the exact previous bug.

Scenario:
1. Add Maden suyu
2. Add Köfte
3. Delete Maden suyu from the Nutrition UI action
4. Verify Köfte remains
5. Verify save is called
6. Verify Nutrition re-renders
7. Duplicate Köfte
8. Verify the original remains and a second row is appended

Result:

**v7.17 nutrition UI runtime bridge tests: PASS**

The earlier ledger edit/delete regression test also still passes.
