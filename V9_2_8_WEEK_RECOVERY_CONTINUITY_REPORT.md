# Athlete Life OS v9.2.8 — Week + Recovery Continuity

## Weekly plan persistence
- The optimized-week result is now structured data in `db.weekOptimizations`, keyed by the Monday date.
- Opening the app hydrates the last optimized result for the current week instead of showing an empty output panel.
- Backup merge/restore explicitly includes `weekOptimizations`.
- Shift inputs remain in `scheduleByDate`/`week`; the derived optimization result is persisted separately.

## Time-aware recovery
- Training rows receive a real `recordedAt` timestamp.
- Recovery uses elapsed hours rather than only whole calendar-day buckets.
- Each training row contributes muscle-specific recovery debt; debt decays continuously with an estimated 24–60 h half-life depending on session recovery cost, mechanical/neural demand and proximity to failure.
- Sleep, protein, energy intake and hydration modulate the decay rate modestly; elapsed time remains the main driver.
- Reports expose the latest muscle-loading timestamp and an approximate ETA to 85% readiness.
- Recovery is explicitly labelled an engineering estimate, not a direct muscle-damage biomarker or clinical measurement.
