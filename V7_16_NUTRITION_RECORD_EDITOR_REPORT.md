# Athlete Life OS v7.16 — Nutrition Record Editor

## Fixed

Food records can now be corrected or removed directly from the Nutrition page.

Each daily food row now exposes:
- **Düzenle**
- **Kopyala**
- **Sil**

The Nutrition page no longer depends on Record Manager for these actions.

## Stable record IDs

All food operations use the record's `logId`, not its visible array index.

This prevents editing/deleting the wrong food after:
- another food is inserted
- a row is normalized/repaired
- the list is re-rendered

## Edit behavior

The dedicated Nutrition editor can change:
- food item
- meal
- serving amount
- time

Saving an edit rebuilds the nutrient snapshot from the selected food and new serving amount while preserving the same `logId`.

Therefore changing:
- Köfte `1.0` serving → `1.5` serving

also recalculates:
- calories
- protein
- carbohydrates
- fat
- fiber
- minerals/vitamins

rather than only changing the displayed serving label.

## Delete behavior

Deleting one food removes only that `logId`.
Daily macro/micro totals and Nutrition Impact are re-rendered immediately.

## Regression test

Executed sequence:
1. Add mineral water
2. Add meatballs
3. Edit meatballs from 1.0 → 1.5 serving
4. Confirm mineral water remains unchanged
5. Confirm meatball kcal changes from 330 → 495
6. Delete mineral water
7. Confirm meatballs remain
8. Confirm totals recalculate
9. JSON persistence round-trip

Result: **PASS**

Record Manager food edit/delete remains available and now also uses the stable-ID Nutrition Ledger operations internally.
