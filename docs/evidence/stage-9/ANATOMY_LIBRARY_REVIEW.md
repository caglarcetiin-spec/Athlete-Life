# Detailed anatomy, persistent model view, quiet updates — 25 September 2026

## Changes
- Bundled muscular system only from Z-Anatomy/BodyParts3D: 669 original named structures, 475 muscle-focused names after support-tissue filter. Original names survive glTF node/primitive splitting. Multi-primitive muscles isolate together. Search, side labels, focus camera, support tissue filter and optional original personal model.
- Saved personal model automatically opens in Reports. Changing/uploading a file is tucked away; database file remains private, per athlete. Model source/orientation/open preference is stored per athlete on the device.
- Worker reports its own version; dismissing a release remembers that version, retains a compact update action and preserves the pending-write safeguard. Guide reminder can be dismissed per athlete/device. Profile bootstrap no longer looks like an interface-mode change.

## Public asset provenance (no personal model read)
Source: https://github.com/nqwrc/3d-anatomy/tree/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/models
Pinned muscular.glb SHA-256: f69ed1287f802a2d603d23293e01512bb57ae77ee7cca1d5527ba00496e51de2 . Input 4,503,232 bytes, Draco decoded offline to 35,589,588 bytes standard GLB using the installed Three.js decoder; no extra runtime decoder, external request or CSP relaxation. Reproduction: `node tools/v2/decode_public_anatomy.cjs /path/to/pinned-public-muscular.glb`. Script rejects other input hashes.
Only muscular.glb used, not visceral/nervous/inner-ear/kidney files. Full upstream notice plus derivative notice retained at public anatomy/LICENSE.txt and visible in UI. BodyParts3D (Database Center for Life Science, CC BY-SA 2.1 Japan), Z-Anatomy (CC BY-SA 4.0); atlas redistribution CC BY-SA 4.0. Application code is separate.

## Scientific limits
Finer geometry is not finer measured physiology. Existing load indices remain regional heuristic estimates. No invented separate percentage for individual heads or left/right muscles; unmatched atlas structures show unknown. Public anatomy is a reference, not a personal physiological scan.

## Verification and failed iterations
- Existing model/API tests plus new logout + new application instance + other-owner isolation: 3 PASS on PostgreSQL; targeted Mongo persistence/owner checks PASS.
- Anatomy browser: public atlas rendered with 400+ selectable muscle labels, left vastus medialis isolation/focus, reload remembers source and logout/login automatically restores personal synthetic model. Final repeat covers multi-primitive grouping.
- Notification regression v2: guide dismissal across reload, genuine mode change notice, no mode notice on login/bootstrap, same-version deferral across reload, pending writes block activation, ACK and activation preserve recorded data, offline shell and axe PASS.
- Failed anatomy-browser setup: script generation syntax typo, no app assertion reached. v2 test toggled the automatically opened model closed; test now expects auto-open rather than clicking the obsolete open step. v3 exposed missing ancestor za_name on primitive meshes; fixed identity preservation before flattening. v4 passes.
- First notification regression ran axe during page entrance opacity animation (intermediate contrast 4.26). Test now awaits animation completion before unchanged accessibility assertions; no contrast rule removed.

No database/account/media migration, no real accounts or personal GLB used for tests. Existing free Render + MongoDB retained. Rollback is previous source/release package; no data rollback. Build and public static allowlists permit only the specific atlas GLB/license paths, not arbitrary files. Published result will be recorded separately after CI/deployment.
