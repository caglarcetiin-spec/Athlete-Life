# Integrated regional 3D recovery — 24 September 2026

## Problem and behavior
The V2 GLB viewer displayed geometry while regional decayed exposures lived only in a 2D panel. Reports now passes one clock-injected analysis into the GLB material overlay, selectable region detail, source set links, complementary reserve index, and 24/48-hour forecasts. Current-day data refreshes every minute, on return to the tab, and after sync cursor changes; geometry is not fetched again. Historical/saved reports remain explicitly dated; “Şimdi hesapla” returns to current recomputation. The 2D report remains in an expandable alternative, using the same result.

Named anatomical meshes receive regional colors. Unlabelled surfaces use an explicitly approximate standing-body classifier, adapted from legacy; Y/Z/X-up and front/back controls allow visual alignment. This cannot segment individual anatomical muscles on an arbitrary unlabelled model. A dropdown provides equivalent region selection without pointer use. Unknown strength exposure is grey, not 100% healed.

## Scientific interpretation
`load-reserve-1` is an unvalidated engineering display index, **not** measured muscle damage, hypertrophy, recovery of force, or clearance to train. Parameters are exposed in the evidence registry. Its eight-set scale, effort/rep weights and inherited 36/48-hour half lives are assumptions, not thresholds derived from clinical literature. Absolute kg is shown as source data; without calibrated personal capacity it is not a damage multiplier. RIR/RPE absent => range; uncertain event time => range. No fixed claim that every back workout recovers to 90% in two days. Non-strength quantities remain in their own units, not converted to strength reserve. Pain, illness and sleep context stays separate.

Context literature: [systematic review of exercise-induced muscle damage markers](https://pubmed.ncbi.nlm.nih.gov/35834532/) and [full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9282447/). Such evidence does not validate these product percentages or an individual's healing from logged sets.

## Verification
- `regional-recovery`: 11 science tests PASS, including clock progression, repeated load, source links, missing effort/time, future/skipped exclusion and no false non-strength conversion.
- `recovery-mongo`: 4 targeted tests PASS against local synthetic Mongo replica set, including existing GLB owner/upload behavior.
- Frontend: 12 tests PASS; TypeScript/build and ESLint PASS; Python Ruff PASS.
- `recovery-browser-final`: PASS (material-name mapping and instancing transforms included), Chrome mobile viewport 390×844. Synthetic named triangle + pure-engine synthetic workout fixture. Shader compilation, raycast selection, unknown region, changed canvas pixels, 60-second clock refresh, no extra GLB download, orientation controls. Personal GLB/accounts not accessed. This does not prove rendering performance of the user's actual 80 MB geometry or physical-phone behavior.
- Report regression expands the intentionally collapsed 2D alternative before retaining all previous source→metric, delete, immutable snapshot, mobile and axe assertions.

- `recovery-api-final`: all 63 API tests PASS at source commit 9856435.
- `recovery-reports`: actual synthetic set creation/deletion, immutable snapshot, mobile layout and axe PASS.
- `recovery-model-regression`: existing GLB upload/reload/camera/broken-file isolation PASS.
- Commit 9856435 prepared locally. GitHub Desktop reports Mac locked; user asked to unlock. No push, CI or Render publication claimed yet.

## Failed attempts retained
- Initial pure/API suite inside sandbox: first four tests passed, then local PostgreSQL TCP denied; rerun with authorized localhost access passed (no assertion changed).
- `recovery-browser`: fixture omitted mandatory version; corrected fixture.
- `recovery-browser-fixed`: accidental invocation of browser_regression with `--help` as node path; failed before browser run. Associated stage-6 run artifact retained; previous latest shift log restored.
- `recovery-browser-v2`: exact accessible label did not match implicit label plus option contents. Added explicit accessible select labels.
- `recovery-browser-v3`: clock installed after interval creation did not control that timer. Clock now installed before page load; same refresh assertion passes in v4.

## Deployment and rollback
No schema, account, media or credential migration; no database write for existing analyses, no new service or paid resource. MongoDB stays on existing configuration; release uses existing free Render service. Canonical records and original GLB remain unchanged. Extra derived `analysis.result.muscle_recovery` is optional for older saved analyses. Rollback = previous source/release package, no data rollback. Clinical validation and exact anatomical segmentation remain absent. CI and live evidence are recorded separately after publication.
