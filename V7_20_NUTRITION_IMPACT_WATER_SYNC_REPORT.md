# Athlete Life OS v7.20 — Nutrition Impact ↔ Water Ledger Sync

## Exact bug

The Water Ledger correctly stored today's added water, but Nutrition Impact's Hydration card
used `rollingNutrition(14).water`.

That created two problems:

1. Today's added water was not the primary Hydration source.
2. Days with food logs but no water log could enter the nutrition average with `water = 0`,
   diluting the displayed hydration value.

Example:
- several prior food-log days with no tracked water
- today +1500 ml Water Ledger

The Hydration card could show a much smaller rolling value instead of today's 1.5 L.

## Fix

The Hydration card now reads:

**today's Water Ledger + today's food/beverage water**

directly from `nutritionMetricsForDate(today)`.

It exposes:
- today's total liters
- direct Water Ledger liters
- food/beverage water liters
- dynamic model range
- whether a real Water Ledger entry exists

The 14-day hydration value is now a separate secondary trend and includes only days that
actually contain a water record. A missing water log is not interpreted as “0 L consumed”.

## Live synchronization

Water add and water delete now explicitly trigger `NutritionImpact.render()` in addition to
the normal Nutrition render path.

Therefore:
- 1.5 L Water Ledger → Hydration shows 1.5 L
- add 500 ml → Hydration shows 2.0 L immediately
- delete that 500 ml → Hydration returns to 1.5 L immediately

## UI wording

Hydration now displays, for example:

`Bugün 2.0 L · su 1.7 L + besin/içecek 0.3 L · model 2.2–2.9 L`

If there is no direct Water Ledger entry, it says:

`Bugün doğrudan su kaydı yok`

instead of pretending the athlete drank 0 L.

## Regression tests

- Nutrition Impact ↔ Water Ledger 1.5 L sync: PASS
- +500 ml live data change → 2.0 L: PASS
- delete 500 ml → 1.5 L: PASS
- rolling hydration excludes no-water days: PASS
- existing Hydration Intelligence tests: PASS
- Water Ledger tests: PASS
- Nutrition Ledger tests: PASS
