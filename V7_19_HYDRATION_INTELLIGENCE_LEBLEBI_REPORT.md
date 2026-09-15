# Athlete Life OS v7.19 — Hydration Intelligence + Leblebi

The old Nutrition Advice treated `targetWater` as an exact physiological requirement and
converted the difference directly into “drink X liters/ml more”. That was too confident.

v7.19 uses one shared Hydration Intelligence model in Daily Nutrition Advice and Nutrition
Impact. It reads direct Water Ledger entries, water from foods/beverages, body weight,
training duration and RPE. Without a measured sweat rate it returns a broad range and
explicitly refuses to calculate exact missing liters or dehydration percentage.

For a 72 kg rest-day fixture the app coaching range is roughly 2.2–2.9 L of total recorded
water. Hard exercise raises/widens the range. A personal sweat-rate measurement would
increase model confidence.

The manual water target remains a user reference but is not treated as a biological
requirement if it conflicts with the dynamic range.

Added food:
**Leblebi, sarı (kavrulmuş, tuzsuz)** — Kuruyemiş & Tohum — 30 g
- 111 kcal
- 5.7 g protein
- 18.2 g carbohydrate
- 1.8 g fat
- 5.0 g fiber

Values are generic roasted-chickpea references and can vary by brand/roasting.

Tests PASS:
- Hydration Intelligence
- old exact-liter advice removed
- Nutrition Impact low/high hydration range
- Leblebi library/schema
- Water Ledger
- Nutrition Ledger
- Nutrition UI runtime
