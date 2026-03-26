# Safe PDF Viewer

A VS Code extension for viewing PDF files — focused, read-only, and secure by default.

Opens any `.pdf` file in a clean webview panel. Navigate pages with keyboard or mouse, zoom in/out, and search text. No editing, no forms, no PDF JavaScript execution.

## Why This Extension?

VS Code has no built-in PDF viewer. Third-party options tend to be heavy, feature-bloated, or use bundled Chromium — all of which expand the attack surface for a file format historically used as a malware vector.

Safe PDF Viewer takes the opposite approach:

- **Read-only by design** — no editing, no annotation, no form filling
- **PDF JavaScript disabled** — `isEvalSupported: false` at the PDF.js level
- **Bundled renderer** — PDF.js ships locally, no CDN, works fully offline
- **Strict CSP** — nonce-gated scripts, no external origins, no `unsafe-eval`
- **Minimal surface** — do one thing well

## Install

1. Open VS Code (or any VS Code-based editor)
2. Go to Extensions
3. Search for "Safe PDF Viewer" or `KunalPathak.safe-pdf-viewer`
4. Click Install

## Usage

Double-click any `.pdf` file in VS Code — it opens directly in the viewer panel.

Navigate with:
- `←` / `→` arrow keys or `PageUp` / `PageDown`
- Mouse scroll wheel
- Click the `‹` `›` navigation arrows
- Type a page number in the jump-to-page input

Zoom with:
- `+` / `-` keys
- Fit-Width and Fit-Page buttons in the toolbar

The page counter in the toolbar shows your position (e.g., "Page 3 / 12").

## Configuration

Open VS Code Settings (`Cmd+,` on macOS, `Ctrl+,` on Windows/Linux) and search for **"Safe PDF Viewer"**.

| Setting | Options | Default | Description |
|---|---|---|---|
| `safePdfViewer.defaultZoom` | `fit-width`, `fit-page`, `75`, `100`, `125`, `150`, `200` | `fit-width` | Default zoom level when opening a PDF |

## Features

- Page-by-page navigation
- Zoom controls (fit-width, fit-page, +/−, percentage)
- Text selection and copy
- In-document text search (`Ctrl+F` / `Cmd+F`)
- Dark and light mode — respects VS Code theme

## Intentional Exclusions

| Feature | Why excluded |
|---|---|
| PDF editing / annotation | Out of scope — read-only by design |
| Form filling | Attack surface expansion; PDF forms can carry malicious payloads |
| PDF JavaScript execution | Disabled at renderer level (`isEvalSupported: false`) |
| External link auto-follow | Open-redirect risk; links are display-only |
| Printing | OS-level complexity out of scope for v1 |
| Password-protected PDFs | Adds crypto complexity deferred to a future version |
| Embedded media playback | Sandbox violation risk |

## Security

- **Content Security Policy** with fresh nonce per render — only nonce-bearing scripts execute
- **No external origins** in CSP — PDF.js is bundled, not CDN-loaded
- **`worker-src blob:`** — Only the PDF.js web worker (created from local bundle) may spawn
- **`localResourceRoots`** — Webview can only access the PDF file and the bundled PDF.js assets; nothing else on disk
- **No user HTML passthrough** — PDF bytes are rendered by PDF.js canvas API, never interpreted as HTML

## For Developers

- [docs/architecture.md](docs/architecture.md) — Design decisions and security model
- [docs/development.md](docs/development.md) — Setup, workflow, and release process
- [CHANGELOG.md](CHANGELOG.md) — Version history
