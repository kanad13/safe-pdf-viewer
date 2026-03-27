# Safe PDF Viewer — VS Code Extension

## Key Context

This extension opens `.pdf` files in a focused, read-only VS Code webview. Pages are rendered via locally bundled PDF.js onto HTML5 canvas. Strict CSP, no CDN, no PDF JavaScript execution. Package name: `safe-pdf-viewer`, command prefix: `safePdfViewer`.

- Primary source files: `src/extension.js` (extension host) and `src/webview.html` (webview UI, ~690 lines)
- Static PDF.js bundle: `lib/pdfjs/pdf.mjs` + `lib/pdfjs/pdf.worker.mjs` (committed, not npm dep)
- Closure-based state (no classes, no globals) — except `SafePdfEditorProvider` (required by VS Code API)
- CSP nonce security on all webview renders

## Architecture Rules

- All extension logic in `src/extension.js` unless it exceeds ~1500 lines
- One webview panel per open PDF document (VS Code manages this via `CustomReadonlyEditorProvider`)
- No TypeScript, no frameworks, no bundler
- PDF.js version in `lib/pdfjs/`: check the comment at the top of `pdf.mjs` for version number
- Two critical security settings that must never be removed:
  - `isEvalSupported: false` — disables PDF JavaScript in PDF.js
  - `localResourceRoots` scoped to `lib/pdfjs/` and the PDF file's directory only

## Code Style (enforced by ESLint)

- Tabs, double quotes, semicolons, Unix line endings
- ES2020, CommonJS (`require`/`module.exports`)
- JSDoc on all exported/public functions
- No TODO comments in code — track in issues

## Git Commits

Concise, imperative mood. Describe _what changed_. Commit at meaningful intervals.

## Multi-File Change Protocol

When a task touches 3+ files or requires multiple related edits:

1. **Branch first** — always work on a feature branch, never directly on main
2. **File-touch matrix** — map which files each change touches, then group/sequence to minimize redundant edits to the same file across commits
3. **Phase the work** — group changes into logical phases (infra/config first, then code, then tests). Never fix a file you're about to delete
4. **Gate each phase** — after each phase: commit, build `.vsix`, run tests, verify before proceeding
5. **Track in a workplan** — for 4+ phases, create a `WORKPLAN.md` (delete when done) with the matrix and checklist

## Testing

### Automated tests

- Run `npm test` — must pass (0 failures, 0 lint errors) before any phase is considered complete

### Manual testing — preferred method (VSIX install)

End-to-end manual verification uses a locally installed `.vsix`, not F5:

1. `npm run package` — builds `safe-pdf-viewer-*.vsix` in the repo root
2. In VS Code: **Extensions** sidebar → `···` menu (top-right) → **Install from VSIX…** → select the file
3. When prompted, click **Reload Window** (or run `Developer: Reload Window` from the Command Palette)
4. Open `examples/test.pdf` — the extension should render it in a webview
5. After testing, uninstall the extension from the Extensions sidebar before the next iteration

Test file at `examples/test.pdf` — 5-page PDF with text, table, and figure areas.

## Security Invariants

These must never be weakened without a documented security review:

| Invariant                                             | Where enforced                               |
| ----------------------------------------------------- | -------------------------------------------- |
| `isEvalSupported: false`                              | `src/webview.html` — PDF.js initialization   |
| `default-src 'none'` in CSP                           | `src/extension.js` — `getWebviewContent()`   |
| No external origins in `script-src`                   | `src/extension.js` — CSP header              |
| `localResourceRoots` scoped to `lib/pdfjs/` + PDF dir | `src/extension.js` — `resolveCustomEditor()` |
| `CustomReadonlyEditorProvider` (never write to disk)  | `src/extension.js` — provider registration   |
