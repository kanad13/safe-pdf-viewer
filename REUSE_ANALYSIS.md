# Reuse Analysis — From Mermaid Slideshow → Safe PDF Viewer

A surgical map of every piece from the mermaid-slideshow-extension and its disposition in the new safe-pdf-viewer extension.

---

## 1. Verbatim Reuse (copy as-is, zero changes)

| Item | Location | Reason |
|---|---|---|
| `getNonce()` function | `src/extension.js` | Pure utility, fully generic |
| `eslint.config.js` | root | Identical code style targets |
| `jsconfig.json` | root | Same ES2020 / CommonJS setup |
| vscode module stub in tests | `test/extension.test.js` | Module override trick is VS Code-agnostic |
| `node --test` runner command | `package.json` scripts | Same test infrastructure |
| `devDependencies` set | `package.json` | `eslint`, `@types/vscode`, `@vscode/vsce` all still needed |
| `context.subscriptions.push()` pattern | `src/extension.js` | Lifecycle management is identical |
| `onDidDispose` cleanup pattern | `src/extension.js` | Disposal logic is identical |
| VS Code CSS variable names | `src/webview.html` | `--vscode-editor-background`, `--vscode-editor-foreground`, etc. |
| CSS reset | `src/webview.html` | `* { box-sizing: border-box; margin: 0; padding: 0; }` |
| System font stack | `src/webview.html` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| `window.addEventListener('message', ...)` | `src/webview.html` | VS Code → webview postMessage channel |
| `onDidChangeActiveColorTheme` listener | `src/extension.js` | Theme awareness is a good practice to keep |
| `onDidChangeConfiguration` listener | `src/extension.js` | User settings re-render trigger |
| Release workflow steps | `docs/development.md` | Process is publisher-agnostic |
| Feature branch conventions | `docs/development.md` | `feat/`, `fix/`, `docs/` naming |
| Commit message format | `CLAUDE.md` | Imperative mood, bullet points |
| Multi-file change protocol | `CLAUDE.md` | Branch-first, phase-gated, workplan for 4+ phases |
| Architecture doc table format | `docs/architecture.md` | Function→purpose table pattern |
| `npm ci` explanation | `docs/development.md` | Reproducible builds rationale |
| `vsce login` / `gh auth` setup | `docs/development.md` | Same publishing pipeline |
| `package.json` fields: `qna`, `pricing`, `license`, `galleryBanner` | `package.json` | Fields are reusable scaffolding |

---

## 2. Adapt / Repurpose (carry the pattern, change the content)

| Item | Mermaid version does... | PDF version should do... |
|---|---|---|
| `activate()` function structure | Registers a command, manages one panel via closure | Registers `CustomReadonlyEditorProvider`; same closure-based panel state |
| `getWebviewContent(...)` | Reads `src/webview.html`, replaces `{{NONCE}}`, `{{THEME}}`, `{{DIAGRAMS_JSON}}` tokens | Reads `src/webview.html`, replaces `{{NONCE}}`, `{{PDF_URI}}`, `{{PDFJS_URI}}` tokens |
| Empty state HTML | "No Mermaid diagrams found" inline page | "No PDF loaded" inline page — same structure |
| Keyboard event handler | Arrow keys → prev/next slide | Arrow keys / PageUp/PageDown → prev/next page |
| Scroll wheel + cooldown | Wheel delta → slide navigation | Wheel delta → page navigation (or zoom) |
| Nav arrow HTML + CSS | Prev/next slide buttons (fixed left/right) | Prev/next page buttons — identical styling |
| Slide counter pill | "2 / 5" bottom-right pill | "Page 2 / 12" bottom-right pill — same CSS |
| `onDidChangeConfiguration` | Re-renders with new Mermaid theme | Re-renders with new zoom level default |
| `onDidChangeActiveColorTheme` | Re-resolves Mermaid theme | Updates CSS variable-based dark/light chrome |
| `activationEvents` | `onLanguage:markdown` | `onCustomEditor:safePdfViewer.pdfEditor` |
| `contributes.configuration` | `mermaidSlideshow.theme` enum | `safePdfViewer.defaultZoom` enum (`fit-width`, `fit-page`, `75`, `100`, `125`) |
| Architecture doc: Security Model | CSP nonces, no HTML passthrough, trusted CDN | CSP nonces, PDF.js local bundle, no PDF JS execution |
| Architecture doc: State Management | `currentPanel`, `currentDocument`, slide index | `currentPanel`, PDF.js `PDFDocumentProxy`, current page, zoom |
| README structure | Why / Install / Usage / Config table / For Developers | Same skeleton, PDF-specific content |
| `CLAUDE.md` architecture rules | Single file, no classes, CDN Mermaid | Single file, no classes, local PDF.js |
| `examples/test.md` | Diverse diagram types | `examples/test.pdf` — multi-page PDF with text, images, mixed layout |
| `.vscodeignore` | Excludes dev/demo assets | Same pattern |

---

## 3. Not Reused (mermaid-specific, no equivalent in PDF viewer)

| Item | Why excluded |
|---|---|
| `extractMermaidBlocks()` | Mermaid text extraction — no analog in PDF |
| `postDiagramUpdate()` / `postMessage` live updates | PDF file is read-only; no live-edit feature |
| `onDidChangeTextDocument` listener | PDF content does not change in-editor |
| CDN (`cdn.jsdelivr.net`) script loading | PDF.js must ship locally — offline support + CSP simplicity |
| `resolveTheme()` | Mermaid theme concept doesn't exist in PDF |
| `mermaid.initialize()` / `mermaid.run()` | Replaced by PDF.js APIs |
| `securityLevel: 'loose'` | Mermaid-specific; PDF.js has its own parallel (`isEvalSupported: false`) |
| Slide-per-diagram concept | PDF uses page-per-page |
| `onLanguage:markdown` activation | Replaced by `onCustomEditor` |
| `{{DIAGRAMS_JSON}}` injection | Replaced by `{{PDF_URI}}` |

---

## 4. New Items Required (no equivalent in mermaid extension)

| Item | Reason |
|---|---|
| `lib/pdfjs/` directory | Bundled PDF.js worker + main module (from Mozilla's dist) |
| `localResourceRoots` in webview options | VS Code requires explicit allowlist for local file access |
| `worker-src blob:` in CSP | PDF.js spawns a web worker via `URL.createObjectURL` |
| `PDFDocumentProxy` / `PDFPageProxy` usage | Core PDF.js rendering API |
| Canvas element in webview | PDF.js renders pages onto `<canvas>` |
| Zoom UI controls (+/−, fit-width, fit-page) | Not needed in mermaid slideshow |
| Jump-to-page input | Useful for long PDFs; no equivalent in mermaid |
| `CustomReadonlyEditorProvider` class | Different VS Code API than `registerCommand` |
| `document.uri` → `webview.asWebviewUri()` conversion | Needed to serve PDF file and PDF.js assets into webview |

---

## 5. Key Architecture Decisions Carried Over

1. **Single source file** (`src/extension.js`) unless it exceeds ~1500 lines
2. **Single webview panel**, reused across files (reveal if exists, create if not)
3. **No runtime npm dependencies** (PDF.js is a static local asset, not an npm dep)
4. **Closure-based state** inside `activate()` — no classes, no module-level globals
5. **CSP nonce** on every render — fresh nonce per `resolveCustomEditor` call
6. **HTML template file** (`src/webview.html`) with `{{TOKEN}}` replacement
7. **No bundler** — extension ships source directly
8. **Node.js built-in test runner** — no Jest, no Mocha

---

## 6. Key Architecture Decisions Changed

| Decision | Mermaid | PDF |
|---|---|---|
| Library delivery | CDN (jsDelivr) | Bundled locally in `lib/pdfjs/` |
| VS Code API entry point | `registerCommand` | `registerCustomEditorProvider` (+ `CustomReadonlyEditorProvider`) |
| CSP `script-src` | `nonce-X https://cdn.jsdelivr.net` | `nonce-X` only (no external origins) |
| CSP `worker-src` | not needed | `blob:` required for PDF.js worker |
| File access | None (diagrams come from document text) | Must allowlist PDF file URI and pdfjs lib dir in `localResourceRoots` |
| Live update | Yes (`onDidChangeTextDocument` + debounce) | No (PDF is read-only) |
| Rendering target | SVG (Mermaid outputs SVG) | `<canvas>` (PDF.js renders bitmap pages) |
