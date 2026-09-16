# Guided planning, goal tracking and live sessions

## User flows

- A three-step questionnaire asks about the sport, experience, equipment, desired outcome, available time, 4/8/12-week horizon and training days. Unselected days are shown as rest days. A generated draft remains editable and does not activate until the final review is accepted.
- Every catalog sport is selectable. The recommendation coverage is explicit: strength/endurance/combat/mind starter templates, a general technique framework for other sports, and calendar-only planning where health/age or specialist safety requirements prevent a numerical suggestion. These are not 199 validated sport-specific coaching protocols.
- Step entry includes plain-language definitions and a separate suggestions flow. Resistance draft increments are user-review rules, not automatically applied overload. Weekly practice and week 4/8/12 reviews use the athlete's actual records; no promised outcome or automatic maximal testing.
- Active plans are pinned on the home page, including the rest-day layout. Expired pinned periods remain visible for review. Removing a plan archives it, preserves historical session links (including a completed session on the removal date), and frees future dates for a replacement.
- Live training tracks elapsed active time, pause/resume, rest timing and actual sets for resistance, skill, interval and continuous steps. Inputs remain draft data until validated; targets never become completed sets by default. A partial session can be finished. Account state preserves a paused run across reloads. Closing an unfinished run archives its draft without counting it as a completed workout.
- Goals are accessible during sports profile setup and from the home/profile pages. Weight, named movement and branch-specific metrics are supported. Matching movement/branch records feed the goal; custom tests have explicit measurement entry. Conditions, discipline and units define the comparison. Weight measurements also join the shared body measurement history.
- `Durumum`, adjacent to Profile, offers daily, weekly, 4-week and 12-week views. It shows scheduled/recorded sessions, actual sets, sleep coverage and change, logged nutrition compared with user-defined targets, and goal trends. Missing records remain unknown. Calendar reference lines are described as arithmetic references rather than physiological forecasts.
- A centered bottom navigation bar provides Back, Home and Forward on each page. Existing profile identity, date/time/duration selectors and professional-mode announcements remain available.

## Data and validation

New account snapshot keys: `athleteGoals`, `goalMeasurements`, `goalHistory`, `activeWorkoutRun`, `workoutRunHistory`. Period metadata records questionnaire answers, recommendation coverage, explicit linked goal IDs and archival cutoffs. No new external service, credential or MongoDB access permission is introduced.

Validated all 199 catalog entries for draft/review compatibility; test coverage includes adult/age scope, specialist fallback, explicit activation, pause/resume/revision conflicts, actual-set validation and projection, duplicate completion rejection, same-day goal observations, matching swimming measurements, missing data, archival history and replacement periods. Existing session, workout, health history, account and mocked MongoDB HTTP tests also pass.

Browser verification used an isolated synthetic SQLite account: goal creation, questionnaire, manual step review, final activation, live set entry, pause, close/reload/resume, partial completion, goal update and mobile layout at 390 px in light/dark themes. Production personal records were not edited for testing.

Sources checked: [ACSM 2026 resistance training guidance](https://acsm.org/resistance-training-guidelines-update-2026/) and [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/adding-adults/what-counts.html). The source guidance supports the broad principles; specific preset values are editable application templates, not universal prescriptions.
