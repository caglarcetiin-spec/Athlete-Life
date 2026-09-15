# Athlete Life OS v9.1 — Training Sync + Evidence Policy

## Implemented
- One selected training date drives the weekly card selection, selected-day prescription, Session Router target and Guided Runner start.
- Previous/next/today training-day navigation added.
- Weekly training cards are keyboard/click selectable; historical targets open the existing editable RecordManager flow.
- Stale idle Guided Runner sessions no longer override the selected day. A session with execution evidence still requires confirmation before archival.
- Local day rollover changed to 00:00 (v9.1 migration). Historical training/nutrition remain stored by date while daily UI advances to the new day.
- Recovery ledger expanded from a fixed 4-day decay to a 7-day time-decay model modestly modified by sleep, protein, energy and hydration.
- Added SportsSciencePolicy v9.1. Recommendations are deterministic and progression-oriented; no random exercise selection is used.
- Skill/isometric work is kept early while fresh; main strength lifts retain continuity; accessory order can be evidence-scored from volume, pain and progression history.
- Added evidence guardrails for weekly volume, RIR, load specificity, ROM, frequency distribution, periodization and calisthenics/isometric specificity.

## Evidence anchors
- ACSM 2026 Resistance Training Position Stand / overview of reviews — PMID 41843416.
- Pelland et al. 2026 dose-response meta-regression — PMID 41343037.
- Refalo et al. 2023 proximity-to-failure meta-analysis — PMID 36334240.
- Robinson et al. 2024 RIR meta-regressions — PMID 38970765.
- Schoenfeld et al. weekly-volume dose response — PMID 27433992.
- Grgic et al. training frequency meta-analysis — PMID 30558493.
- Moesgaard et al. periodization meta-analysis — PMID 35044672.
- Carvalho et al. ROM meta-analysis — PMID 34170576.
- Morton et al. protein meta-analysis/meta-regression — PMID 28698222.

## Important modeling rule
The app does not claim to know exact biological recovery or hypertrophy percentages. Sleep, nutrition, hydration, RIR, set volume and local load are decision-support inputs. Where calisthenics-specific direct evidence is sparse, the engine uses resistance-training evidence plus movement-specific biomechanics/isometric evidence and marks these relationships as model assumptions rather than facts.
