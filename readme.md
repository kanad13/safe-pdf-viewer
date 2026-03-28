# Safe PDF Viewer

A focused, read-only PDF viewer for VS Code.

**Secure by default: PDF JavaScript disabled, no CDN, strict Content Security Policy.**

## Why this extension?

VS Code has no built-in PDF viewer. Most third-party options are either heavy, feature-bloated, or pull a full Chromium browser into your editor — expanding the attack surface for a file format [historically used as a malware vector](https://www.cve.org/CVERecord/SearchResults?query=pdf).

This VS Code Extension (named "Safe PDF Viewer") takes the secure approach: do one thing, do it simply, and lock it down.

- **Read-only by design** — no editing, no annotation, no form filling
- **PDF JavaScript disabled** — `isEvalSupported: false` blocks code execution at the renderer level
- **No CDN, fully offline** — PDF.js is bundled locally; zero outbound network requests
- **Strict CSP** — nonce-gated scripts, no external origins, no `unsafe-eval`

## Features

- **Zero setup** — just install the extension and open any `.pdf` file immediately; no commands, no configuration required
- **Keyboard-first navigation** — arrow keys, Page Up/Down, scroll wheel, direct page number entry
- **Text search** — `Ctrl+F` / `Cmd+F` opens a floating find panel; highlights all matches, jumps between them
- **Clickable hyperlinks** — internal PDF links navigate within the document; external links open in your system browser
- **Zoom controls** — fit-page, step zoom (+/−), or set a fixed percentage as the default
- **Password-protected PDFs** — prompts inline, retries on wrong password, cancels gracefully
- **Respects your VS Code theme** — all UI elements use VS Code CSS variables; works in light, dark, and high-contrast modes

## Keyboard shortcuts

| Action                | Keys                                  |
| --------------------- | ------------------------------------- |
| Previous / next page  | `←` `→` or `PageUp` `PageDown`        |
| Zoom in / out         | `+` `-`                               |
| Open find panel       | `Ctrl+F` / `Cmd+F`                    |
| Next / previous match | `Enter` / `Shift+Enter` in find panel |
| Close find panel      | `Escape`                              |
| Jump to page          | Click the page number field and type  |

## Install

1. Open VS Code (`Ctrl+Shift+X` / `Cmd+Shift+X` → Extensions)
2. Search `KunalPathak.safe-pdf-viewer`
3. Click **Install**

Once installed, open any `.pdf` file in the Explorer — it opens directly in the viewer.

## Configuration

Open VS Code Settings (`Ctrl+,` / `Cmd+,`) and search **"Safe PDF Viewer"**.

| Setting                     | Options                                            | Default    | Description                           |
| --------------------------- | -------------------------------------------------- | ---------- | ------------------------------------- |
| `safePdfViewer.defaultZoom` | `fit-page`, `50`, `75`, `100`, `125`, `150`, `200` | `fit-page` | Default zoom level when opening a PDF |

## Security

Every layer limits what a malicious PDF can do:

| Layer                                                 | What it blocks                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `isEvalSupported: false`                              | Disables PDF JavaScript execution at the PDF.js renderer level   |
| `default-src 'none'` CSP                              | Blocks all content not explicitly whitelisted                    |
| Nonce-gated scripts                                   | Only the inline script with a fresh per-render nonce can execute |
| `localResourceRoots` scoped to `lib/pdfjs/` + PDF dir | Webview cannot read arbitrary files from disk                    |
| No external origins                                   | PDF.js is bundled locally; zero outbound network                 |
| `CustomReadonlyEditorProvider`                        | Extension never writes to disk                                   |
| External links: http/https only                       | `javascript:`, `data:`, `file:` schemes are blocked              |

## What this viewer does not do

| Feature                  | Why                                                            |
| ------------------------ | -------------------------------------------------------------- |
| PDF editing / annotation | Out of scope — read-only by design                             |
| Form filling             | Expands attack surface; PDF forms can carry malicious payloads |
| PDF JavaScript execution | Disabled at renderer level (`isEvalSupported: false`)          |
| Printing                 | OS-level complexity out of scope                               |
| Embedded media playback  | Sandbox violation risk                                         |

## For developers

- [docs/architecture.md](docs/architecture.md) — Design decisions and security model
- [docs/development.md](docs/development.md) — Setup, workflow, and release process
- [CHANGELOG.md](CHANGELOG.md) — Version history
