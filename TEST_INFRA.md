# E2E Test Infra: webcanhan-cms-security-persistence

## Test Philosophy
- Opaque-box, requirement-driven. Derives from ORIGINAL_REQUEST.md.
- Automated browser testing via Playwright.

## Feature Inventory & Test Coverage
| # | Feature | Requirement | Tier 1 (Isolation) | Tier 2 (Boundary) | Tier 3 (Cross-feature) | Tier 4 (Workload) |
|---|---------|-------------|:------------------:|:-----------------:|:----------------------:|:-----------------:|
| 1 | Public Read-Only Security | R2 | Verify #visual-editor-dock absent on fresh load | Alt+E shortcut blocked | Contenteditable attribute strictly 0 across page | Unauthenticated visitor browsing all sections |
| 2 | Explorations Cleanliness | R1 | Verify #openCodeModalBtn absent | Verify #codeModal absent | Click moment card -> #previewModal opens | Multiple cards opened & closed |
| 3 | Admin PIN Authentication | R2 | Incorrect PIN rejected | Correct PIN unlocks Admin Studio | Logout deactivates edit dock & cleans session | Session expiry & re-auth flow |
| 4 | Reload Persistence & Hydration | R3 | Edit text -> reload -> text intact | Special chars, long strings | Edit text + image -> reload -> both intact | Hard F5 reload without flashing static HTML |

## Test Architecture
- Test script: `scripts/verify-persistence-hydration.mjs`
- Test command: `node scripts/verify-persistence-hydration.mjs` (or `npm test`)
- Pass/fail semantics: Exit code 0 on all tests passing, exit code 1 with descriptive failure logs on any assertion failure.
- When ready, publish `TEST_READY.md` at project root.
