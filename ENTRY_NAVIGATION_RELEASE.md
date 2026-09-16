# Session entry and navigation update

## Behavior

- The session form lists only eligible movement links on the selected date and plan blocks matching both the date and sport. When none exist it explains why, instead of presenting a one-option dropdown. Still-valid selections survive a redraw; invalidated selections are announced.
- Strength/set entry also works without a period. The athlete defines the steps and records actual sets separately. Planned targets remain sourced from the selected plan, and completed-session snapshots remain intact.
- Linking to an existing movement session prevents both duplicate session counts and a second projection of its sets into movement analysis. Original movement rows remain the owner of that analysis.
- Model descriptions without additional measurements no longer pretend to be measurement forms. Supported measurement fields still round-trip through their existing validation and analytics.
- Date, time and duration fields receive accessible selectors. Date inputs accept ISO, day-first dot/slash/hyphen formats and eight-digit day-month-year input. Calendar validity remains strict. Time/duration choices preserve original storage units and field bounds.
- The common picker supports dynamically created dialogs and the legacy exercise form, including changes between seconds, minutes, repetitions and distance. Cadence/speed fields are not treated as duration fields.
- Account identity is visible in the common header. The profile identity card appears before guidance/settings. Back/forward buttons integrate with browser history; hash routes survive reload.
- Switching to professional mode displays a dismissible explanation, shortcuts and newly revealed menu badges. Reduced-motion preferences suppress the attention animation.

## Validation

- Model tests: ambiguous/invalid dates, leap days, midnight-safe dates, duration unit conversion, actual measurement storage, planned and unplanned set execution, link eligibility and duplicate counting/projection.
- Existing workout, session ledger, sports profile, health, backup and history integration tests.
- Authenticated asset and account HTTP tests with isolated SQLite; cloud HTTP tests with mocked MongoDB.
- Browser: synthetic accounts only; matched plan/movement record on 10 September, 90.5-minute conversion, unplanned Push-Up record, overnight sleep, back/forward, profile placement, mode announcement, 390-pixel mobile layout, legacy static/dynamic exercise field switching and invalid-date validation.

No production personal records or database credentials are changed by this release.
