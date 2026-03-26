# Architecture

Design decisions and architectural patterns for the Safe PDF Viewer extension.

## Overview

The extension opens `.pdf` files in a focused, read-only VS Code webview. Pages are rendered via a **locally bundled PDF.js** (Mozilla) onto HTML5 canvas elements. The entire extension host logic lives in a single file (`src/extension.js`) with no runtime npm dependencies.

## High-Level Flow

```
User opens .pdf file in VS Code
         ↓
VS Code calls resolveCustomEditor(document, webviewPanel, token)
         ↓
getWebviewContent(pdfUri, pdfjsUri, nonce) → HTML
         ↓
Webview loads PDF.js from local bundle (no CDN)
         ↓
PDF.js fetches PDF via webview-safe URI, renders page 1 onto <canvas>
         ↓
User navigates with arrow keys / scroll / click
         ↓
On config change: updated zoom default applied to new panels
```

One active webview panel per file (VS Code manages this via the custom editor API). Panel state lives in a closure inside `resolveCustomEditor`.

## Key Functions

| Function | Purpose |
|---|---|
| `getNonce()` | Generates random 32-char alphanumeric token for CSP (verbatim from mermaid-slideshow) |
| `getWebviewContent(pdfUri, pdfjsUri, nonce)` | Reads `src/webview.html`, replaces `{{NONCE}}`, `{{PDF_URI}}`, `{{PDFJS_URI}}`, `{{DEFAULT_ZOOM}}` tokens, returns full HTML |
| `activate(context)` | Registers `CustomReadonlyEditorProvider`, applies `onDidChangeConfiguration` listener |
| `SafePdfEditorProvider.resolveCustomEditor(document, webviewPanel, _token)` | Sets up webview options, CSP, and posts initial config; handles incoming messages |

## VS Code API: CustomReadonlyEditorProvider

Unlike a command-based panel, `CustomReadonlyEditorProvider` is triggered by VS Code's file-opening mechanism. When the user opens a `.pdf` file, VS Code routes it to this provider automatically.

```
register → contributes.customEditors in package.json
         → viewType: "safePdfViewer.pdfEditor"
         → filenamePattern: "*.pdf"
```

This is more idiomatic than a command for file-type viewers. The tradeoff vs the mermaid-slideshow command approach:
- **Pros:** Integrates with file explorer, tab system, and editor groups natively
- **Cons:** Slightly more VS Code API surface to understand

## Security Model

PDF files are an attack surface. Defense layers:

1. **CSP with Nonces:** Fresh nonce per `resolveCustomEditor` call. Only scripts bearing the nonce execute. No external script origins allowed.
2. **No CDN:** PDF.js ships inside the extension (`lib/pdfjs/`). Zero outbound network. Works offline.
3. **`worker-src blob:`:** PDF.js spawns a web worker using `URL.createObjectURL(blob)`. This is the only non-`none` worker origin, and it is already sandboxed within the webview.
4. **`localResourceRoots` allowlist:** The webview can only load resources from two directories — the PDF.js lib folder and the folder containing the open PDF. It cannot access any other path on disk.
5. **`isEvalSupported: false`:** Passed to `pdfjsLib.GlobalWorkerOptions` — disables PDF JavaScript execution at the renderer level.
6. **Read-Only Provider:** `CustomReadonlyEditorProvider` signals to VS Code (and downstream tools) that this editor never writes to disk.
7. **No User HTML Passthrough:** PDF bytes are decoded and painted onto canvas by PDF.js. The content of the PDF file is never interpreted as HTML or injected into the DOM as a string.

### CSP Header

```
default-src 'none';
script-src 'nonce-NONCE';
worker-src blob:;
style-src 'unsafe-inline';
img-src WEBVIEW_RESOURCE_URI: data:;
```

The `img-src` uses the webview's own resource scheme (e.g., `vscode-resource:`) plus `data:` for PDF-embedded images rendered via canvas — never an external origin.

## State Management

State is closure-scoped inside `resolveCustomEditor`, keeping it per-panel:

- `currentPage` — 1-based index of the visible page
- `totalPages` — populated after PDF loads
- `currentZoom` — active zoom (string: `"fit-width"`, `"fit-page"`, or `"125"` etc.)
- `pdfUri` — the VS Code `Uri` of the open file

The webview-side state (canvas content, scroll position) lives entirely in the webview. The extension host does not try to mirror it.

### Extension ↔ Webview Communication

Messages follow a `{ type, ...payload }` convention (same as mermaid-slideshow):

| Direction | Message type | Payload | Purpose |
|---|---|---|---|
| Extension → Webview | `"init"` | `{ pdfUrl, defaultZoom }` | Sent once after webview is ready |
| Webview → Extension | `"ready"` | — | Signals DOMContentLoaded, triggers init |
| Webview → Extension | `"pageChanged"` | `{ page, total }` | Updates extension-side state (for status bar, etc.) |

## PDF.js Integration

PDF.js is consumed as a static local bundle, not as an npm dependency.

**Why not an npm dep?**
- The extension ships source directly (no bundler). `require('pdfjs-dist')` would need a bundler to work in the webview context.
- Bundling PDF.js into a Webview-compatible IIFE is simpler to manage as a one-time `lib/` asset.

**Setup (one-time, during development):**
1. Download the prebuilt PDF.js dist from [mozilla/pdf.js releases](https://github.com/mozilla/pdf.js/releases)
2. Copy `pdfjs-dist/build/pdf.mjs` and `pdfjs-dist/build/pdf.worker.mjs` into `lib/pdfjs/`
3. These files are committed to the repo — no build step, no CDN

**Worker setup in webview:**
```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUri; // webview URI to lib/pdfjs/pdf.worker.mjs
```

## Guidelines for Changes

**Safe to modify:** CSS styling, zoom UI, toolbar layout, page counter, keyboard shortcuts.

**Requires care:** CSP header, nonce generation, `localResourceRoots`, PDF.js worker setup, `isEvalSupported`.

**Never change:** The read-only nature of the provider. No modification of PDF bytes. No execution of embedded PDF JavaScript.
