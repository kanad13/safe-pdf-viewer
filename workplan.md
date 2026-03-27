# Safe PDF Viewer — Roadmap Plan

Single source of truth for all pending work. Refer to `docs/development.md` for the release workflow and `docs/architecture.md` for security invariants.

---

## Next set of features planned

## Phase 1 — Thumbnail Panel

**Goal:** Side panel showing page thumbnails for quick navigation.
**Branch:** `feat/thumbnails`

#### Tasks

- [ ] Add a resizable side panel (left or right of main viewport) using split-pane layout
- [ ] Render low-resolution thumbnails using `page.render` at small scale
- [ ] Clicking a thumbnail navigates to that page
- [ ] Highlight the currently viewed page thumbnail
- [ ] Panel visibility toggled via toolbar button; state persists via VS Code `setState`
- [ ] Thumbnails lazy-load via intersection observer as user scrolls panel

#### Manual Tests

- Thumbnail panel toggles open/closed
- Clicking a thumbnail jumps to the correct page
- Current page thumbnail is visually highlighted
- Scrolling the panel lazy-loads additional thumbnails

#### Exit Gate

- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes
- [ ] Manual thumbnail navigation verified
- [ ] Commit and merge: `feat: thumbnail panel for quick page navigation`

---

## Phase 2 — Outline / Bookmarks

**Goal:** PDF outline (table of contents) displayed as a tree panel for quick navigation.
**Branch:** `feat/outline`

#### Tasks

- [ ] Call `pdfDoc.getOutline()` to retrieve the document's bookmark tree
- [ ] Render outline as a collapsible tree panel (alongside or replacing the thumbnail panel)
- [ ] Clicking an outline entry navigates to the referenced page/destination
- [ ] Handle flat and nested outlines (expand/collapse)
- [ ] Show informational message when the PDF has no outline
- [ ] Panel visibility toggled via toolbar button

#### Manual Tests

- Outline panel toggles open/closed
- Outline entries match the bookmarks in the PDF
- Clicking an entry jumps to the correct page
- Nested items expand/collapse correctly
- PDFs without outlines show a graceful message

#### Exit Gate

- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes
- [ ] Manual outline navigation verified on a PDF with bookmarks
- [ ] Commit and merge: `feat: outline/bookmark panel via PDF.js getOutline`

---

## Phase 3 — Password-Protected PDFs (v0.3.0)

**Goal:** PDFs protected with a user password can be opened via VS Code's input box API.
**Branch:** `feat/password`

#### Security requirements (non-negotiable)

- The entered password must **never be logged or persisted** — not to `console`, not to `localStorage`, not to extension state
- Re-prompt must stop after 3 failed attempts (denial-of-service guard)

#### Tasks

- [ ] Detect `PasswordException` when loading with `pdfjsLib.getDocument()`
- [ ] On password error, call `vscode.window.showInputBox({ password: true, prompt: "Enter PDF password" })`
- [ ] Retry `getDocument({ url, password })` with the entered password
- [ ] Handle incorrect password: show error notification and re-prompt (max 3 attempts)
- [ ] Handle user cancellation gracefully — show "Password required" in viewer, no crash
- [ ] Confirm password is never logged or persisted anywhere in the flow

#### Manual Tests

- Opening a password-protected PDF shows the VS Code input prompt
- Correct password renders the PDF normally
- Wrong password shows error and re-prompts (stops after 3 attempts)
- Pressing Escape/Cancel shows status message without crashing

#### Exit Gate

- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes (mock password flow)
- [ ] Manual password tests pass with a real encrypted PDF
- [ ] Commit and merge: `feat: password-protected PDF support`
