# Safe PDF Viewer

A VS Code extension for viewing PDF files - focused, read-only, and secure by default.

Opens any `.pdf` file in a clean webview panel. Navigate pages with keyboard or mouse, zoom in/out, and search text. No editing, no forms, no PDF JavaScript execution.

## Why This Extension?

VS Code has no built-in PDF viewer. Many other VSCode PDF options tend to be heavy, feature-bloated, or use bundled Chromium - all of which expand the attack surface for a file format historically used as a malware vector.

Safe PDF Viewer takes the opposite approach:

- **Read-only by design** - no editing, no annotation, no form filling
- **PDF JavaScript disabled** - `isEvalSupported: false` at the PDF.js level
- **Bundled renderer** - PDF.js ships locally, no CDN, works fully offline
- **Strict CSP** - nonce-gated scripts, no external origins, no `unsafe-eval`
- **Minimal surface** - do one thing well

## Features

- **Install and use** - Install the extension and start viewing PDFs immediately, no commands, no setup
- **Keyboard first** - Navigate with arrow keys, `PageUp` / `PageDown`, scroll wheel, toolbar `‹` `›` buttons, or type a page number directly, zoom with `+` / `-` or fit-page, open search with `Ctrl+F` / `Cmd+F`.
- **Works fully offline** - PDF.js is bundled locally, no network requests
- **Secure - PDF JavaScript disabled** - no code execution from PDF content
- **Dark and light theme** - respects your VS Code theme automatically
- **Works with password-protected PDFs** - prompts for password inline, retries up to 3 times, cancels gracefully

## Install

1. Open VS Code (or any VS Code-based editor)
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"Safe PDF Viewer"** or `KunalPathak.safe-pdf-viewer`
4. Click **Install**

## Usage

Double-click any `.pdf` file in the Explorer - it opens directly in the viewer.

| Action | Keyboard shortcut |
| ---------------------- | ---------------------------------- |
| Previous / next page   | `←` `→` or `PageUp` `PageDown`    |
| Zoom in / out          | `+` `-`                            |
| Open search bar        | `Ctrl+F` / `Cmd+F`                 |
| Jump to page           | Click the page number in the toolbar and type |

## Configuration

Search for **"Safe PDF Viewer"** in VS Code Settings (`Cmd+,` on macOS, `Ctrl+,` on Windows/Linux).

| Setting                     | Options                                            | Default    | Description                           |
| --------------------------- | -------------------------------------------------- | ---------- | ------------------------------------- |
| `safePdfViewer.defaultZoom` | `fit-page`, `50`, `75`, `100`, `125`, `150`, `200` | `fit-page` | Default zoom level when opening a PDF |

## What This Viewer Does Not Do

| Feature                   | Why                                                              |
| ------------------------- | ---------------------------------------------------------------- |
| PDF editing / annotation  | Out of scope - read-only by design                               |
| Form filling              | Attack surface expansion; PDF forms can carry malicious payloads |
| PDF JavaScript execution  | Disabled at renderer level (`isEvalSupported: false`)            |
| External link auto-follow | Open-redirect risk; links are display-only                       |
| Printing                  | OS-level complexity out of scope for v1                          |
| Embedded media playback   | Sandbox violation risk                                           |

## Security

Every layer limits what a malicious PDF can do.

- **Content Security Policy** with fresh nonce per render - only nonce-bearing scripts execute
- **No external origins** - PDF.js is bundled locally, zero outbound network
- **`worker-src blob:`** - only the PDF.js web worker may spawn
- **`localResourceRoots`** - webview can only access the PDF file and the bundled PDF.js assets; nothing else on disk
- **No user HTML passthrough** - PDF bytes are painted to canvas by PDF.js, never interpreted as HTML

## For Developers

- [docs/architecture.md](docs/architecture.md) - Design decisions and security model
- [docs/development.md](docs/development.md) - Setup, workflow, and release process
- [CHANGELOG.md](CHANGELOG.md) - Version history
