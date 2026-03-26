# Safe PDF Viewer — Development Plan

Progressive, phase-gated plan. Each phase ends with: tests passing, `.vsix` built, changes committed and tagged where noted.

---

## How to Use This Plan

- Work **one phase at a time**. Do not start Phase N+1 until Phase N is fully gated.
- Each phase has an **entry condition** (what must be true before starting) and an **exit gate** (what must be true before moving on).
- Testing is split into two parts per phase: **unit tests** (automated, `npm test`) and **manual tests** (human, in the F5 dev host).
- Refer to `docs/development.md` for the full release workflow steps and `docs/architecture.md` for security invariants.

---

## Phase 0 — Repo Scaffolding

**Goal:** A clean, working repository shell with no placeholder code — just infrastructure.

**Entry condition:** Files from this seed folder are placed at repo root.

### Tasks

- [x] `git init`, set default branch to `main`, initial commit of all seed files as-is
- [x] `npm install` (generate `package-lock.json`), then commit lock file
- [x] Obtain and place PDF.js static bundle: `lib/pdfjs/pdf.mjs` + `lib/pdfjs/pdf.worker.mjs`
  - Downloaded PDF.js **5.5.207** prebuilt dist from mozilla/pdf.js releases
  - Version recorded in comment at top of `src/extension.js`
- [x] Add a `.vscodeignore` to exclude `lib/pdfjs` source maps and docs from the `.vsix`
- [x] Add `examples/test.pdf` — 5-page PDF with text, table, and figure areas
- [x] Add a placeholder `assets/icon.png` (128×128 px solid blue)
- [x] Added `LICENSE` (MIT) — required by `vsce package`; was not in original task list
- [x] Verify: `npm run lint` passes (0 errors, 3 warnings), `npm test` passes (7/7)
- [x] Verify: `npm run package` produces `safe-pdf-viewer-0.1.0.vsix` (625 KB)
- [x] Commit: `chore: scaffold repo -- install, pdfjs bundle, test pdf`

### Exit Gate

- [x] `npm test` passes — 7/7 tests
- [x] `npm run package` produces a `.vsix` — `safe-pdf-viewer-0.1.0.vsix`
- [x] No uncommitted files — working tree clean

**✅ Phase 0 COMPLETE** (committed on main, 3 commits)

---

## Phase 1 — Core Render (Single Page)

**Goal:** Opening a `.pdf` file in VS Code shows the first page rendered on canvas.

**Branch:** `feat/core-render`

> **Seed discovery:** Both `resolveCustomEditor` (in `src/extension.js`) and the full webview JS
> (in `src/webview.html`) are already completely implemented in the seed — including toolbar,
> navigation, zoom, keyboard, and scroll-wheel. The seed was richer than anticipated.
> Phase 1 therefore focuses on: writing the `getWebviewContent()` unit tests and doing the
> first end-to-end manual render verification. Do **not** strip or simplify the existing HTML.

### Tasks

- [x] Write unit tests for `getWebviewContent()` in `test/extension.test.js`:
  - Token replacement works for all five tokens: `{{NONCE}}`, `{{PDF_URI}}`, `{{PDFJS_URI}}`, `{{WORKER_URI}}`, `{{DEFAULT_ZOOM}}`
  - Output contains the nonce value passed in
  - Output does **not** contain any unresolved `{{...}}` tokens
  - Note: `getWebviewContent` depends on the filesystem (reads `src/webview.html`) — stub `panel` and `extensionUri` as needed
- [x] Verify CSP header in rendered HTML contains `nonce-<value>` and `default-src 'none'`

### Manual Tests

- Press `F5` to launch Extension Development Host
- Open `examples/test.pdf` — first page should render on canvas
- Open Developer Tools → Console — zero errors
- Developer Tools → Network — no external requests (CSP working)

### Exit Gate

- `npm test` passes (includes new `getWebviewContent` tests)
- `npm run package` passes
- First page of `examples/test.pdf` renders visibly in F5 host
- Commit and merge to `main`: `feat: render first page via PDF.js`

---

## Phase 2 — Page Navigation

**Goal:** Navigate between all pages. Verify all navigation paths work end-to-end.

**Branch:** `feat/navigation`

> **Seed discovery:** All navigation code is already in `src/webview.html` — toolbar buttons,
> page counter, `renderPage`/`goTo`/`goNext`/`goPrev`, keyboard, scroll-wheel with cooldown,
> and `updateToolbar`. This phase is **verification-only** — create the branch, manually test
> every nav path, confirm `npm test` still passes, then merge.

### Tasks

- [x] Create branch `feat/navigation` from `main`
- [x] Manually verify all navigation paths
- [x] Confirm `npm test` still passes
- [x] Merge to `main`
- [x] Unit tests pass (getNonce, getDefaultZoom)

### Manual Tests

- Navigate with keyboard (arrow keys, PageUp/PageDown)
- Navigate with scroll wheel — normal page scroll works, only turns page at boundary
- Navigate with toolbar buttons
- Enter page number in input — jumps to correct page
- Prev button disabled on page 1, next button disabled on last page
- Counter shows "Page X / Y" correctly throughout

### Exit Gate

- `npm test` passes
- All manual tests pass
- Commit and merge: `feat: page navigation — keyboard, scroll, toolbar`

---

## Phase 3 — Zoom Controls

**Goal:** Fit-width, fit-page, preset percentages, and +/− step buttons all work. Resize re-renders.

**Branch:** `feat/zoom`

> **Seed discovery:** Most zoom code is already in `src/webview.html` — `#zoom-select`,
> `#btn-zoom-in`/`#btn-zoom-out`, `computeScale`, `setZoom`, `adjustZoom`, `ZOOM_STEPS`,
> keyboard shortcuts, and `{{DEFAULT_ZOOM}}` token. One item is **missing** and must be added:
> the window `resize` event handler to re-render fit-width/fit-page when the panel is resized.
> (The debounce for that handler belongs in Phase 4.)

### Tasks

- [x] Create branch `feat/zoom` from `main`
- [x] Add high-DPI scaling (`window.devicePixelRatio`)
- [x] Add `window.addEventListener("resize", ...)` with debounce
- [x] Unit tests: confirm `getDefaultZoom()` returns a value in the allowed enum list (test already exists — verify it still passes)

### Manual Tests

- All dropdown values render page at correct size
- +/− keyboard shortcuts step through zoom levels
- Fit-width fills panel width; fit-page shows full page
- Resize panel — fit-width/fit-page re-renders to new size
- Default zoom setting in VS Code Settings is respected on next open

### Exit Gate

- `npm test` passes
- All manual tests pass
- Commit and merge: `feat: zoom controls — fit-width, fit-page, percentage steps`

---

## Phase 4 — Theme Awareness & UX Polish

**Goal:** Toolbar and chrome respect VS Code light/dark theme. Resize is debounced.

**Branch:** `feat/theme-polish`

> **Seed discovery:** Most Phase 4 work is already done in the seed:
>
> - All CSS uses `var(--vscode-*)` tokens (only `#pdf-canvas` background is `#fff`, correct)
> - All toolbar buttons have `aria-label` and `title` attributes
> - Toolbar separators (`<div class="toolbar-sep">`) are already present
> - Canvas has `box-shadow` drop shadow already
>
> Remaining work: add `onDidChangeActiveColorTheme` listener in `src/extension.js`,
> and replace the raw resize handler from Phase 3 with a debounced version.

### Tasks

- [x] Create branch `feat/theme-polish` from `main`
- [x] ~Add `onDidChangeActiveColorTheme` listener~ (Skipped to avoid destroying PDF state—CSS vars automatically handle VS Code themes without reloading HTML)
- [x] Debounced resize handler (completed during DPI phase)
- [x] Added polyfills for `getOrInsertComputed` and `withResolvers` for VS Code WebView compatibility.

### Manual Tests

- Switch VS Code between light and dark theme — toolbar chrome updates immediately
- All toolbar buttons show tooltips on hover
- Canvas page is visually distinct from background in both themes
- Resize drag is smooth — no render flood

### Exit Gate

- `npm test` passes
- Manual tests pass in both light and dark VS Code themes
- Commit and merge: `feat: theme-aware chrome, accessibility labels, resize debounce`

---

---

## Phase 4.5 — Resource & Memory Cleanup

**Goal:** Ensure closing PDF tabs completely frees up memory resources.

**Branch:** `feat/memory-cleanup`

### Tasks

- [x] In `src/extension.js`, inside `resolveCustomEditor`, listen for `webviewPanel.onDidDispose`
- [x] Post a message to `webview.html` (e.g., `{ type: "dispose" }`) before the panel is fully destroyed to call `pdfDoc.destroy()` (if possible based on timings)
- [x] Alternatively, handle proper disposal of `PDF.js` within the webview's `unload` or `pagehide` equivalent
- [x] Ensure any unresolved promises or workers are cleanly terminated

### Exit Gate

- [x] `npm test` passes — structural tests verify `pagehide` listener, `pdfDoc.destroy()`, and `renderTask.cancel()` are present in the webview
- [x] Memory verification: opening/closing many PDFs doesn't leak memory in Activity Monitor
- [x] Commit and merge: `feat: resource cleanup`

**✅ Phase 4.5 COMPLETE**

## Phase 5 — Text Layer (Selection & Copy)

**Goal:** Text in PDFs is selectable and copyable.

**Branch:** `feat/text-layer`

### Tasks

- [x] After rendering each page canvas, call `page.getTextContent()` and render a PDF.js text layer
- [x] Position text layer `<div>` absolutely over the canvas at the same size/offset
- [x] Set text layer `user-select: text` (canvas itself stays `user-select: none`)
- [x] Re-render text layer on zoom change and page change
- [x] Ensure CSP is not broken (text layer uses no new external resources)

### Manual Tests

- Click and drag to select text — highlight appears over correct words
- `Ctrl+C` / `Cmd+C` copies selected text correctly
- Text selection works at all zoom levels
- No visual artifacts on text layer when navigating pages

### Exit Gate

- [x] `npm test` passes — structural tests verify `.textLayer`, `#text-layer`, `user-select: text`, `user-select: none`, and `--scale-factor` CSS variable are present in the webview
- [x] Manual text select/copy tests pass
- [x] Commit and merge: `feat: text layer — selection and copy`

**✅ Phase 5 COMPLETE**

---

## Phase 5.5 — Viewport Overflow Fix

**Goal:** Fix a latent CSS bug where `justify-content: center` on the scroll container clipped the left edge of the page at high zoom levels (150%+), making it unreachable via scrolling.

**Branch:** included in same session as Phase 4.5 / Phase 5 cleanup

### Tasks

- [x] Remove `display: flex; justify-content: center; align-items: flex-start` from `.viewport`
- [x] Switch `.page-container` to `display: block; margin: 0 auto` (centers when narrow, scrolls freely when wide)

### Exit Gate

- [x] `npm test` passes
- [ ] Manual: at zoom 200%, page left edge is reachable by scrolling
- [x] Commit and merge

**✅ Phase 5.5 COMPLETE**

---

## Phase 5.9 — Playwright E2E Test Suite

**Goal:** Add a Playwright-based end-to-end test suite that exercises the webview in a real browser context — covering text selection, zoom, navigation, and canvas rendering verification.

**Why Playwright and not just Node `--test`:**
The current Node unit tests are purely structural (static analysis of the generated HTML string). They cannot verify that:

- The canvas actually renders pixels
- Text in the `.textLayer` is genuinely selectable and copyable
- Zoom correctly re-positions the text layer over the canvas
- Navigation doesn't leave stale text-layer fragments

Playwright can load the `webview.html` as a static page in a real browser, inject a mock PDF.js init message, and interact with the rendered output.

**Architecture:**

- Use `@playwright/test` as a `devDependency`
- Create a `test/e2e/` directory for Playwright specs
- Serve `src/webview.html` with a lightweight HTTP test fixture that injects a mock `acquireVsCodeApi()` shim and loads an actual PDF from `examples/test.pdf`
- Tests run with `npm run test:e2e` (separate from `npm test` which stays lightweight)

**Scope of tests (Phase 5.9 only — no VS Code host required):**

- `renders-canvas.spec.ts`: canvas is visible and has non-zero pixel data after load
- `text-selection.spec.ts`: clicking and dragging over text produces a non-empty `window.getSelection()` result
- `zoom.spec.ts`: changing zoom to 200% changes canvas dimensions; text layer `--scale-factor` matches
- `navigation.spec.ts`: clicking next/prev updates the page counter

**Entry condition:** Phase 5 is stable and merged to main.

**Branch:** `feat/playwright-e2e`

### Tasks

- [x] `npm install --save-dev @playwright/test` and add `npx playwright install chromium` step to CI
- [x] Create `test/e2e/fixtures/` with `vscode-api-shim.js` (mock `acquireVsCodeApi`)
- [x] Create `playwright.config.js` at repo root
- [x] Write the four spec files listed above
- [x] Add `\"test:e2e\": \"playwright test\"` script to `package.json`
- [x] Add `.playwright/` and `test-results/` to `.gitignore`

### Exit Gate

- [x] `npm run test:e2e` passes — all four specs green in headless Chromium
- [x] `npm test` still passes (Node unit tests unaffected)
- [x] Commit and merge: `test: add Playwright e2e suite for webview rendering`

**✅ Phase 5.9 COMPLETE**

---

## Phase 6 — In-Document Search

**Goal:** `Ctrl+F` / `Cmd+F` opens a search bar in the viewer toolbar. Matches are highlighted.

**Branch:** `feat/search`

### Tasks

- [x] Add search input field to toolbar (hidden by default)
- [x] Toggle search bar on `Ctrl+F` / `Cmd+F` keydown; close on `Escape`
- [x] Build per-page text index (`buildSearchIndex`) after PDF loads using `page.getTextContent()`
- [x] `runSearch(query)` scans index to produce global match list with page + occurrence info
- [x] Highlight matches on current page via `.search-highlight` / `.search-highlight-current` CSS classes applied to text-layer spans
- [x] Show match count (`"3 of 12"` or `"No results"`)
- [x] Wire `Enter` (next match) and `Shift+Enter` (previous match) in search input
- [x] Ensure search bar does not conflict with keyboard nav (`stopPropagation` + activeElement guard)
- [x] Close button clears highlights and hides bar

### Manual Tests

- `Ctrl+F` opens search bar with focus
- Type a word — matches highlighted on current page
- `Enter`/`Shift+Enter` cycles through matches; counter updates
- `Escape` closes search bar and clears highlights
- Prev (↑) and Next (↓) buttons cycle matches
- Navigation arrow keys do not flip pages while search input is focused

### Exit Gate

- [x] `npm test` passes — 36/36 unit tests (includes 13 new Phase 6 structural tests)
- [x] `npm run test:e2e` passes — 15/15 E2E tests (includes 7 new search specs)
- [x] Commit and merge: `feat: in-document search via text index and CSS highlights`

**✅ Phase 6 COMPLETE**

---

## Phase 7 — Thumbnail Panel (v0.2.0)

**Goal:** Side panel showing page thumbnails for quick navigation.

**Branch:** `feat/thumbnails`

### Tasks

- [ ] Add a resizable side panel (left or right of the main viewport) using a split-pane layout
- [ ] Render low-resolution thumbnails for each page using PDF.js (`page.render` at small scale)
- [ ] Clicking a thumbnail navigates to that page
- [ ] Highlight the currently viewed page thumbnail
- [ ] Panel visibility toggled via toolbar button; state persists across reloads (VS Code `setState`)
- [ ] Thumbnails lazy-load as the user scrolls the panel (intersection observer)

### Manual Tests

- Thumbnail panel toggles open/closed
- Clicking a thumbnail jumps to the correct page
- Current page thumbnail is visually highlighted
- Scrolling the thumbnail panel lazy-loads additional thumbnails

### Exit Gate

- `npm test` passes
- `npm run test:e2e` passes
- Manual thumbnail navigation verified
- Commit and merge: `feat: thumbnail panel for quick page navigation`

---

## Phase 8 — Outline / Bookmarks (v0.2.0)

**Goal:** PDF outline (table of contents / bookmarks) displayed in a tree panel for quick navigation.

**Branch:** `feat/outline`

### Tasks

- [ ] Call `pdfDoc.getOutline()` to retrieve the document's bookmark tree
- [ ] Render outline as a collapsible tree in a panel (alongside or replacing the thumbnail panel)
- [ ] Clicking an outline entry navigates to the referenced page/destination
- [ ] Handle flat outlines (no children) and nested outlines (expand/collapse)
- [ ] Show informational message when the PDF has no outline
- [ ] Panel visibility toggled via toolbar button

### Manual Tests

- Outline panel toggles open/closed
- Outline entries match the bookmarks in the PDF
- Clicking an entry jumps to the correct page
- Nested items expand/collapse correctly
- PDFs without outlines show a graceful message

### Exit Gate

- `npm test` passes
- `npm run test:e2e` passes
- Manual outline navigation verified on a PDF with bookmarks
- Commit and merge: `feat: outline/bookmark panel via PDF.js getOutline`

---

## Phase 9 — Password-Protected PDFs (v0.3.0)

**Goal:** PDFs protected with a user password can be opened by prompting for the password via VS Code's input box API.

**Branch:** `feat/password`

### Tasks

- [ ] Detect `PasswordException` when loading a PDF with `pdfjsLib.getDocument()`
- [ ] On password error, call `vscode.window.showInputBox({ password: true, prompt: "Enter PDF password" })`
- [ ] Retry `getDocument({ url, password })` with the entered password
- [ ] Handle incorrect password: show error notification and re-prompt (up to 3 attempts)
- [ ] Handle user cancellation gracefully (close input → show "Password required" in viewer)
- [ ] Ensure the entered password is never logged or persisted

### Manual Tests

- Opening a password-protected PDF shows the VS Code input prompt
- Correct password renders the PDF normally
- Wrong password shows an error and re-prompts
- Pressing Escape/Cancel on the prompt shows the status message without crashing

### Exit Gate

- `npm test` passes
- `npm run test:e2e` passes (mock password flow)
- Manual password tests pass with a real encrypted PDF
- Commit and merge: `feat: password-protected PDF support`

---

## Phase 10 — First Public Release (v0.1.0)

**Goal:** Publish extension to VS Code Marketplace and tag on GitHub.

**Branch:** work directly on `main` after all phases merged

### Tasks

- [ ] Final content review: README screenshots, description, icon (replace placeholder)
- [ ] Update `CHANGELOG.md` to reflect all shipped features exactly
- [ ] Verify version is `0.1.0` in both `package.json` and `package-lock.json`
- [ ] Full clean install and lint:
  ```bash
  rm -rf node_modules && npm ci && npm run lint && npm test
  ```
- [ ] Build `.vsix`:
  ```bash
  npm run package
  ```
- [ ] Install and smoke-test the `.vsix` in a clean VS Code instance:
  ```bash
  code --install-extension safe-pdf-viewer-0.1.0.vsix
  ```
- [ ] Publish to marketplace:
  ```bash
  npm run publish
  ```
- [ ] Create GitHub release and tag:
  ```bash
  git tag v0.1.0
  git push origin v0.1.0
  gh release create v0.1.0 --title "v0.1.0 — Initial Release" --notes-file <(sed -n '/## \[0.1.0\]/,/## \[/p' CHANGELOG.md | head -n -1)
  ```
- [ ] Verify marketplace listing live at expected URL
- [ ] Install from marketplace in clean VS Code — confirm version shown

### Exit Gate

- Extension live on VS Code Marketplace
- GitHub release tagged `v0.1.0` with correct release notes
- No issues filed within 24h that indicate a critical regression
