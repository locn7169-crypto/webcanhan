# Project: webcanhan-cms-security-persistence

## Architecture
- **Presentation & Content Layer**:
  - `index.html`: Public website markup. Must remain strictly read-only for unauthenticated visitors. No active edit controls, docks, or editable attributes.
  - Moment cards in `#explorations` with 4:3 image, left title, right metadata, bottom caption, and image preview modal via `src/scripts/explorations-moments.ts`. Source code button and Code Modal completely removed.
- **Authentication & Access Control Layer**:
  - `src/scripts/auth-gate.ts`: Single source of truth for admin PIN verification, session tokens with expiration, and authentication checks.
  - `src/scripts/admin-studio.ts`: Admin Studio drawer and PIN modal. Removes cleartext PIN hint ("1902"). On logout, destroys active editor modes.
  - `src/scripts/tiptap-editor.ts`: Gated against unauthorized activation (`Alt + E` / `Option + E` blocked unless authenticated).
  - `src/scripts/exploration-journal.ts`: Post deletion, image replacement, and contenteditable strictly gated by `isAdminAuthenticated()`.
- **Persistence & Hydration Layer**:
  - `ensureDeterministicEditKeys()` in `src/scripts/tiptap-editor.ts`: Tag elements deterministically with `data-edit-key` on initial `DOMContentLoaded` before hydration.
  - `restoreSavedContent()`: Hydrates text edits from `localStorage` (`loc_portfolio_tiptap_v2`) synchronously on initial load so DOM text never reverts or flickers.
  - `src/scripts/exploration-journal.ts`: Unifies IndexedDB version to `2`, eliminating `VersionError`.
  - `src/scripts/admin-studio.ts`: Synchronizes media items and covers on every reload.
  - `src/scripts/cloud-cms-sync.ts`: Extends `CloudCMSData` to include `textEdits` alongside media items, collections, journal categories, and PIN.
- **Verification & Deployment Layer**:
  - `scripts/verify-persistence-hydration.mjs`: Automated Playwright test suite verifying unauthenticated public read-only lockdown, admin PIN authentication, text/image reload persistence, and absence of source code button/modal.
  - Production build: `npm run build` (`tsc && vite build`).
  - Desktop archive: `/Users/nguyenthanhloc/Desktop/dist.zip`.
  - Deployment: `npx wrangler pages deploy dist --project-name nguyenthanhloc --commit-dirty=true`.
  - Git: Commit all changes and push to `origin main`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Remove "Mã nguồn" button | Remove `#openCodeModalBtn` and container `.explorations-header-actions` from `#explorations` | M1 | Survey 1 (index.html, explorations-moments.ts) |
| F2 | Remove Code Modal & code output | Remove `#codeModal`, `#cleanCodeOutput`, `#copyCodeBtn`, `#closeCodeBtn`, and event listeners | M1 | Survey 1 (index.html, explorations-moments.ts, main.css) |
| F3 | Preserve moment card layout & preview | Maintain 4:3 image, left title, right meta, bottom caption, and working `#previewModal` | M1 | Survey 1 (explorations-moments.ts, main.css) |
| F4 | Centralized Auth Gate | Implement `auth-gate.ts` with PIN verification, session token, and `isAdminAuthenticated()` | M2 | Survey 2 (src/scripts/auth-gate.ts) |
| F5 | Block Unauthorized Edit Activation | Gate `Option + E` / `Alt + E` and `toggleTiptapEditMode` behind PIN authentication | M2 | Survey 2 & 3 (tiptap-editor.ts) |
| F6 | Eliminate Inline contenteditable Leaks | Prevent `exploration-journal.ts` from setting `contenteditable="true"` or delete buttons for public users | M2 | Survey 2 (exploration-journal.ts) |
| F7 | Remove Cleartext PIN Hint | Eliminate `<div class="admin-auth-hint">Mã PIN mặc định: 1902...</div>` from admin auth modal | M2 | Survey 2 (admin-studio.ts) |
| F8 | Proper Admin Logout | Ensure logging out clears auth token and deactivates any active Tiptap edit dock/mode | M2 | Survey 2 (admin-studio.ts) |
| F9 | Deterministic DOM Tagging | Add `data-edit-key` to all candidate elements on `DOMContentLoaded` before hydration | M3 | Survey 2 & 3 (tiptap-editor.ts) |
| F10 | Immediate Text Hydration on Reload | Ensure `restoreSavedContent()` restores text changes from `localStorage` on initial page load | M3 | Survey 2 & 3 (tiptap-editor.ts) |
| F11 | Unify IndexedDB Version to 2 | Fix `exploration-journal.ts` `indexedDB.open` version from 1 to 2 to eliminate `VersionError` | M3 | Survey 2 & 3 (exploration-journal.ts) |
| F12 | Image & Cover Reload Hydration | Ensure `admin-studio.ts` hydrates image covers and journal data unconditionally on page load | M3 | Survey 3 (admin-studio.ts, explorations-moments.ts) |
| F13 | Cloud Gist Text Sync | Include `textEdits` in `CloudCMSData`, `pushCloudCMS()`, and `syncCMSFromCloud()` | M3 | Survey 2 & 3 (cloud-cms-sync.ts, admin-studio.ts) |
| F14 | Playwright Test Suite (Tiers 1-4) | Automated browser tests: public read-only, admin PIN login, reload persistence, no code button/modal | E2E | Survey 3 (scripts/verify-persistence-hydration.mjs) |
| F15 | Production Build & Packaging | Run `npm run build`, update `/Users/nguyenthanhloc/Desktop/dist.zip` from `dist/` | M4 | Survey 3 (package.json, dist) |
| F16 | Cloudflare Pages Deploy & Git Push | Run `npx wrangler pages deploy dist --project-name nguyenthanhloc --commit-dirty=true` and `git push origin main` | M4 | Survey 3 (ORIGINAL_REQUEST R5) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Explorations Section Cleanup | F1, F2, F3: Remove "Mã nguồn" button & Code Modal, preserve card layout & preview modal | none | DONE |
| M2 | Strict Authentication Gating | F4, F5, F6, F7, F8: Centralized auth gate, gate keyboard shortcuts, public read-only, remove PIN hint | none | PLANNED |
| M3 | Hydration & Cloud Persistence Engine | F9, F10, F11, F12, F13: Deterministic tagging, text/image reload hydration, IndexedDB v2, Gist sync | M2 | PLANNED |
| E2E | E2E Testing Suite (Playwright) | F14: Comprehensive automated browser tests verifying R1, R2, R3, R4 | none | PLANNED |
| M4 | Final Integration, Packaging & Deployment | F15, F16: Verify 100% E2E tests pass, build, package desktop dist.zip, deploy Cloudflare Pages, git push | M1, M3, E2E | PLANNED |

## Interface Contracts
### `src/scripts/auth-gate.ts`
- `isAdminAuthenticated(): boolean` - returns true only if valid unexpired admin session token exists.
- `verifyAdminPin(enteredPin: string): Promise<boolean>` - checks local stored PIN and remote Cloud Gist PIN.
- `setAdminAuthenticated(remember?: boolean): void` - creates authenticated session with timestamp.
- `clearAdminAuthentication(): void` - removes all session and persistent tokens.
- `requestAdminAccess(): void` - opens PIN modal if unauthenticated.

### `src/scripts/tiptap-editor.ts`
- `ensureDeterministicEditKeys(): void` - executes on DOMContentLoaded to tag editable elements with stable `data-edit-key`.
- `restoreSavedContent(): void` - parses stored edits and hydrates DOM elements synchronously.
- `toggleTiptapEditMode(enable: boolean): void` - gated; aborts and prompts PIN if `!isAdminAuthenticated()`.

### `src/scripts/cloud-cms-sync.ts`
- `CloudCMSData`: Extended to include `textEdits?: Record<string, { html: string; style?: Record<string, string> }>`.

## Code Layout
- `index.html`: Public HTML structure.
- `src/scripts/auth-gate.ts`: Authentication state & token management.
- `src/scripts/admin-studio.ts`: Admin drawer, settings, cloud push/pull, media manager.
- `src/scripts/tiptap-editor.ts`: Rich text editor, DOM tagging, local text persistence.
- `src/scripts/exploration-journal.ts`: Journal modal, photo moments, category browsing.
- `src/scripts/explorations-moments.ts`: Moment cards grid in `#explorations`, image preview modal.
- `src/scripts/cloud-cms-sync.ts`: Cloudflare/GitHub Gist sync bridge.
- `src/styles/main.css`: Global styles.
- `scripts/verify-persistence-hydration.mjs`: Automated Playwright test harness.
