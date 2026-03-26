# Safe PDF Viewer — VS Code Extension

## Key Context

This extension opens `.pdf` files in a focused, read-only VS Code webview. Pages are rendered via locally bundled PDF.js onto HTML5 canvas. Strict CSP, no CDN, no PDF JavaScript execution. Package name: `safe-pdf-viewer`, command prefix: `safePdfViewer`.

- Single source file: `src/extension.js`
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

Concise, imperative mood. Describe *what changed*. Commit at meaningful intervals.

## Multi-File Change Protocol

When a task touches 3+ files or requires multiple related edits:

1. **Branch first** — always work on a feature branch, never directly on main
2. **File-touch matrix** — map which files each change touches, then group/sequence to minimize redundant edits to the same file across commits
3. **Phase the work** — group changes into logical phases (infra/config first, then code, then tests). Never fix a file you're about to delete
4. **Gate each phase** — after each phase: commit, build `.vsix`, run tests, verify before proceeding
5. **Track in a workplan** — for 4+ phases, create a `WORKPLAN.md` (delete when done) with the matrix and checklist

## Testing

- Manual testing via F5 debug launch
- Test file at `examples/test.pdf` — should be a multi-page PDF with mixed content (text, images, tables)
- `npm test` must pass before any work is considered complete

## Security Invariants

These must never be weakened without a documented security review:

| Invariant | Where enforced |
|---|---|
| `isEvalSupported: false` | `src/webview.html` — PDF.js initialization |
| `default-src 'none'` in CSP | `src/extension.js` — `getWebviewContent()` |
| No external origins in `script-src` | `src/extension.js` — CSP header |
| `localResourceRoots` scoped to `lib/pdfjs/` + PDF dir | `src/extension.js` — `resolveCustomEditor()` |
| `CustomReadonlyEditorProvider` (never write to disk) | `src/extension.js` — provider registration |
