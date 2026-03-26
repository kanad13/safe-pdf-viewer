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

- [ ] `git init`, set default branch to `main`, initial commit of all seed files as-is
- [ ] `npm install` (generate `package-lock.json`), then commit lock file
- [ ] Obtain and place PDF.js static bundle: `lib/pdfjs/pdf.mjs` + `lib/pdfjs/pdf.worker.mjs`
  - Download from [mozilla/pdf.js releases](https://github.com/mozilla/pdf.js/releases) (prebuilt dist, not legacy)
  - Commit both files; record the PDF.js version in a comment at top of `src/extension.js`
- [ ] Add a `.vscodeignore` to exclude `lib/pdfjs` source maps and docs from the `.vsix`
- [ ] Add a `examples/test.pdf` — any multi-page PDF works; a good test PDF has: text content, an image, a table, at least 5 pages
- [ ] Add a placeholder `assets/icon.png` (128×128 px solid colour is fine for now)
- [ ] Verify: `npm run lint` passes, `npm test` passes (lifecycle smoke tests only at this point)
- [ ] Verify: `npm run package` produces a `.vsix` without errors
- [ ] Commit: `chore: scaffold repo — install, pdfjs bundle, test pdf`

### Exit Gate

- `npm test` passes
- `npm run package` produces a `.vsix`
- No uncommitted files

---

## Phase 1 — Core Render (Single Page)

**Goal:** Opening a `.pdf` file in VS Code shows the first page rendered on canvas. Nothing else.

**Branch:** `feat/core-render`

### Tasks

- [ ] Wire up `SafePdfEditorProvider.resolveCustomEditor` fully:
  - Set `webviewOptions` with correct `localResourceRoots`
  - Generate nonce, render `getWebviewContent()`, set `webviewPanel.webview.html`
  - Listen for `"ready"` message → send `"init"` with PDF URI
- [ ] Implement webview JS (`src/webview.html`):
  - Import PDF.js via `{{PDFJS_URI}}`
  - Set `workerSrc` to `{{WORKER_URI}}`
  - On `"init"` message: call `pdfjsLib.getDocument({ url, isEvalSupported: false })`
  - On load success: call `renderPage(1)` — draw onto `#pdf-canvas`
  - On load failure: show plain text error message
  - Send `"ready"` on `DOMContentLoaded`
- [ ] Strip the toolbar/zoom/nav from this phase — add them in later phases. Show only the canvas.
- [ ] Write unit tests for `getWebviewContent()`:
  - Token replacement works (`{{NONCE}}`, `{{PDF_URI}}`, etc.)
  - Output contains the nonce value
  - Output does not contain unresolved `{{...}}` tokens

### Manual Tests

- Open `examples/test.pdf` — first page should render
- Open Developer Tools — no console errors
- Confirm CSP blocks any attempted external load (check Network tab: no external requests)

### Exit Gate

- `npm test` passes (includes new `getWebviewContent` tests)
- `npm run package` passes
- First page of `examples/test.pdf` renders visibly
- Commit and merge to `main`: `feat: render first page via PDF.js`

---

## Phase 2 — Page Navigation

**Goal:** Navigate between all pages. Toolbar shows prev/next buttons and page counter.

**Branch:** `feat/navigation`

### Tasks

- [ ] Add prev/next toolbar buttons (`#btn-prev`, `#btn-next`) and page counter (`#page-input`, `#page-total`)
- [ ] Implement `renderPage(n)` with cancel-previous-render logic (`renderTask.cancel()`)
- [ ] Implement `goTo(n)`, `goNext()`, `goPrev()` with clamping
- [ ] Wire keyboard: `ArrowRight`/`ArrowDown`/`PageDown` → next; `ArrowLeft`/`ArrowUp`/`PageUp` → prev
- [ ] Wire scroll-wheel with cooldown — turn page only at scroll boundary (not mid-page)
- [ ] Wire `#page-input` change event (jump to typed page number)
- [ ] `updateToolbar()` — disable prev at page 1, disable next at last page
- [ ] Unit tests:
  - `getNonce()` returns 32 alphanumeric chars (already exists — verify still passes)
  - `getDefaultZoom()` returns a valid value (already exists — verify still passes)
  - No new unit-testable pure functions to add in this phase (nav logic is webview-side)

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

**Goal:** Fit-width, fit-page, preset percentages, and +/− step buttons all work.

**Branch:** `feat/zoom`

### Tasks

- [ ] Add zoom toolbar: `#zoom-select` dropdown, `#btn-zoom-in`, `#btn-zoom-out`
- [ ] Implement `computeScale(pdfPage)`:
  - `fit-width`: `viewportWidth / unscaledPageWidth`
  - `fit-page`: `min(viewportWidth / W, viewportHeight / H)`
  - Numeric string (e.g. `"125"`): `parseFloat / 100`
- [ ] Implement `setZoom(value)` and `adjustZoom(direction)` stepping through `ZOOM_STEPS`
- [ ] Wire `+` / `-` keyboard shortcuts (skip when `#page-input` focused)
- [ ] On window `resize`, re-render current page (fit-width/fit-page need re-computation)
- [ ] Apply `{{DEFAULT_ZOOM}}` token on page load; sync `#zoom-select` value on init
- [ ] Unit tests: `getDefaultZoom()` returns a value in the enum list

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

**Goal:** Toolbar and chrome respect VS Code light/dark theme. Minor UX improvements.

**Branch:** `feat/theme-polish`

### Tasks

- [ ] Audit all CSS: ensure every colour uses `var(--vscode-*)` tokens, never hardcoded colours
  - Exception: `#pdf-canvas` background stays `#fff` — PDF page background is always white
- [ ] Add `onDidChangeActiveColorTheme` listener in `src/extension.js` — reload webview HTML with fresh nonce when theme changes
- [ ] Toolbar accessibility: add `aria-label` and `title` (hover tooltip) to all buttons
- [ ] Add toolbar separator elements between logical groups (nav / zoom)
- [ ] Canvas drop shadow to distinguish page from panel background
- [ ] Debounce window resize handler (avoid re-render on every pixel during drag)
- [ ] No new unit tests required for this phase

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

## Phase 5 — Text Layer (Selection & Copy)

**Goal:** Text in PDFs is selectable and copyable.

**Branch:** `feat/text-layer`

### Tasks

- [ ] After rendering each page canvas, call `page.getTextContent()` and render a PDF.js text layer
- [ ] Position text layer `<div>` absolutely over the canvas at the same size/offset
- [ ] Set text layer `user-select: text` (canvas itself stays `user-select: none`)
- [ ] Re-render text layer on zoom change and page change
- [ ] Ensure CSP is not broken (text layer uses no new external resources)

### Manual Tests

- Click and drag to select text — highlight appears over correct words
- `Ctrl+C` / `Cmd+C` copies selected text correctly
- Text selection works at all zoom levels
- No visual artifacts on text layer when navigating pages

### Exit Gate

- `npm test` passes
- Manual text select/copy tests pass
- Commit and merge: `feat: text layer — selection and copy`

---

## Phase 6 — In-Document Search

**Goal:** `Ctrl+F` / `Cmd+F` opens a search bar in the viewer toolbar. Matches are highlighted.

**Branch:** `feat/search`

### Tasks

- [ ] Add search input field to toolbar (hidden by default)
- [ ] Toggle search bar on `Ctrl+F` / `Cmd+F` keydown; close on `Escape`
- [ ] Use PDF.js `PDFFindController` to drive search with `findagain` / `find` events
- [ ] Highlight matches on current page; show match count (`"3 of 12"`)
- [ ] Wire `Enter` (next match) and `Shift+Enter` (previous match) in search input
- [ ] Ensure search bar does not conflict with keyboard nav (suppress nav keys when search is focused)

### Manual Tests

- `Ctrl+F` opens search bar with focus
- Type a word — matches highlighted on current page
- `Enter`/`Shift+Enter` cycles through matches; counter updates
- `Escape` closes search bar and clears highlights
- Search works across pages (PDF.js find controller handles cross-page)

### Exit Gate

- `npm test` passes
- All manual search tests pass
- Commit and merge: `feat: in-document search via PDF.js find controller`

---

## Phase 7 — First Public Release (v0.1.0)

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

---

## Future Phases (Post v0.1.0)

Track these as GitHub issues; do not start until v0.1.0 is stable:

| Phase | Feature | Notes |
|---|---|---|
| v0.2.0 | Thumbnail panel | Side panel showing page thumbnails for quick nav |
| v0.2.0 | Outline / bookmarks | PDF.js `getOutline()` to show in a Tree View |
| v0.3.0 | Password-protected PDFs | `getDocument({ password })` + VS Code input prompt |
| v0.4.0 | Annotation display | Read-only rendering of existing PDF annotations via PDF.js |
| v1.0.0 | Stability + telemetry review | Production hardening before "v1" label |
