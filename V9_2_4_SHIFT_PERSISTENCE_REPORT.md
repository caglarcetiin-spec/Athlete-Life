# v9.2.4 Shift Persistence Fix

- Added a dedicated **Vardiyayı Kaydet** button to the Today / Bugünkü Vardiya card.
- Saves work status, shift, work intensity and steps without overwriting unrelated morning check-in fields.
- Persists the dated shift to both `db.daily[date]` and `db.scheduleByDate[date]`.
- Emits a dated `SHIFT_RECORDED` event.
- Rebuilds only unlocked future plan projections so the Program Engine immediately uses the new shift for the recommended training window.
- Added inline save/error feedback and bumped the PWA cache.
