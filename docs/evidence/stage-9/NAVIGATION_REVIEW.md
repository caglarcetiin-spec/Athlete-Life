# Navigation simplification — 2026-09-27

## User problem and result
Professional mode exposed 15 primary destinations while Tools repeated Plan, Goals and Reports. Workout/Plan pages also redirected to one another with extra toolbar buttons. There are now five stable destinations in both modes: Today, Training, Health, Progress, Tools. Training owns Sessions/Plan/Week; Health owns Health/Nutrition; Progress owns Status/Reports/Goals. Tools retains its card layout for Capability, Events, Backups, Science, System and Guide. Profile remains in the header. No domain feature is removed.

Mobile uses a fixed five-item bottom bar; desktop uses the same hierarchy in the sidebar. Only one is visible/accessibility-exposed for its viewport. Active parent and current subsection are identified. Hash deep links and date/session parameters remain valid. Route changes focus the content region; compact history controls remain available. Today includes recent canonical sessions linking to their exact session/date. Existing palette and light/dark themes are preserved with quieter, consistent typography.

## Verification
Source base: 5ab4d7561e148cae12b65af760bd18d8a8f4ed23, working branch codex/simple-navigation. Evidence JSON records command, worktree, environment, stdout/stderr and exit code.

- `navigation-client`: 14 tests PASS.
- ESLint PASS; `navigation-build` TypeScript/Vite PASS.
- `navigation-browser`: desktop/mobile five destinations, grouped deep links, no duplicate Tools cards, selected-date preservation, history, focus, light/dark axe and no overflow PASS.
- `navigation-golden`: all 10 journeys PASS, 99.11 seconds. Includes shift, restore, runner, lifestyle, reports, movement, recovery, anatomy, navigation, experience. Runner test additionally checks activity-feed link reopens exact session with its three saved sets.
- `navigation-package`: 9 public files, includes existing licensed atlas; no runtime data.
- Screenshots navigation-390.png, navigation-1280.png and navigation-dark.png inspected after entry animation completes. Initial draft screenshots caught the entry fade; settled captures replaced them, without changing contrast assertions.
- No real account, personal GLB, health record or production database used for tests. Synthetic isolated PostgreSQL locally; full MongoDB regression will run in CI.

## Release and rollback
Existing free Render and MongoDB retained. No schema, account or media migration; no preference/data rewrite. Rollback by deploying previous main 563a90e847ae221e46de195a217b1c83cc8a50d5. Browser cache version updates via existing safe update flow. GitHub CI and Render/live verification pending at this local evidence commit.

Reference for requested interaction pattern: official Strava Help Center articles “How do I Record an Activity on Strava?” and “Training Log” describe bottom navigation recording and progress grouping. No branding/assets copied and no Strava integration introduced.
