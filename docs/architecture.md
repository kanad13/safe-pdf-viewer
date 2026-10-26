# Architecture

This guide explains how the extension is built and why. Start with the overview, read the flows for the mechanics, and use the security section when you change anything that touches the webview.

## Overview

The extension opens `.pdf` files in a read-only VS Code webview. A locally bundled PDF.js renders each page onto a canvas, and a transparent text layer on top supports selection, search and links.

- **Extension host (`src/extension.js`):**
  - Registers the custom editor.
  - Builds the webview page from `src/webview.html`.
  - Answers messages from the webview: ready, password prompts, external links.
- **Webview page (`src/webview.html`):**
  - Holds the toolbar, find panel, styles and the module script.
  - Loads PDF.js, renders pages, handles navigation, zoom and search.
- **PDF.js bundle (`lib/pdfjs/`):**
  - Committed files, loaded from the extension's own resource origin.
  - No bundler, no CDN, no production npm dependency.

Two terms recur below. A Content Security Policy (CSP) is a browser rule that lists what a page may load or run. A nonce is a random one-time token that marks the page's own script as allowed.

The four parts relate in one flow. VS Code asks the host for an editor, the host renders the page template with a fresh nonce, the page loads PDF.js and asks the host for the document address, and PDF.js reads the file through the webview resource origin.

## Open-a-PDF flow

```
User opens a .pdf file
        ↓
VS Code calls resolveCustomEditor(document, webviewPanel)
        ↓
Host sets localResourceRoots, renders webview.html with a fresh nonce and the CSP
        ↓
Webview module loads PDF.js and posts { type: "ready" }
        ↓
Host replies { type: "init", pdfUrl } with the webview URI of the file
        ↓
PDF.js loads the document, the page renders, the text layer and links follow
        ↓
Search index builds in the background
```

- **One panel per file:**
  - VS Code creates one webview per open document through the custom editor API.
- **Zoom default:**
  - A new panel reads `safePdfViewer.defaultZoom` when it opens. Open panels keep their zoom.

## Extension host

- **Provider:**
  - `SafePdfEditorProvider` implements the custom editor provider. The VS Code API requires a class here.
  - `openCustomDocument` returns the URI. The editor is read-only, so no document model is needed.
- **Template rendering:**
  - `renderWebviewHtml(template, values)` fills the page in a single pass with function replacers.
  - The same function builds the pages in the browser tests, so tests and product share one policy.
- **Messages:**
  - `createMessageHandler(webview, pdfFileUri)` returns the handler. It type-checks every field because the webview renders attacker-controlled documents.

## Webview page

- **State:**
  - Page state lives in the page script: the loaded document, current page, zoom, render task, text layer, search index and matches.
  - `vscode.setState({ page, zoom })` lets VS Code restore the page and zoom when a tab comes back. VS Code scopes that state to the webview of one editor.
- **Rendering:**
  - Each request for a page takes a generation number. Work that finishes after a newer request stops silently.
  - `currentPage` moves when a page is requested, so rapid key presses continue from the latest target.
- **Timers:**
  - A 150 ms debounce re-renders after a resize, only in fit-page mode.
  - A 400 ms cooldown limits wheel-driven page turns at the scroll boundary.

## Messages

Messages follow a `{ type, ...payload }` convention.

| Direction           | Type                  | Payload                        | Purpose                                                    |
| ------------------- | --------------------- | ------------------------------ | ---------------------------------------------------------- |
| Webview → Extension | `"ready"`             | none                           | The page is listening; the host replies with `init`        |
| Extension → Webview | `"init"`              | `{ pdfUrl }`                   | Starts the document load                                   |
| Webview → Extension | `"passwordRequired"`  | `{ isWrongPassword: boolean }` | PDF.js raised a password exception; the host prompts       |
| Extension → Webview | `"password"`          | `{ value: string }`            | The typed password; the webview retries                    |
| Extension → Webview | `"passwordCancelled"` | none                           | The prompt was dismissed; the webview shows a message      |
| Webview → Extension | `"openLink"`          | `{ url: string }`              | A link annotation was clicked; the host opens http(s) URLs |

### Password flow

```
Webview: getDocument(url) → PasswordException
Webview → Host: { type: "passwordRequired", isWrongPassword: false }
Host: showInputBox({ password: true })
Host → Webview: { type: "password", value } or { type: "passwordCancelled" }
Webview: getDocument(url, password)
  └─ success → render
  └─ PasswordException → prompt again (three prompts in total)
  └─ cancelled or exhausted → status message
```

- **Handling:**
  - The host never logs or stores the password.
  - The webview passes it to `getDocument()` and keeps it only in the arguments of the retry call.
  - Each failed attempt destroys its loading task.

## Security model

PDF files are an attack surface. Several independent layers limit what a hostile document can do.

| Layer                          | What it limits                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| CSP with a per-editor nonce    | Only the page's own module script runs; no eval; no network origin except the extension's resource origin                 |
| Bundled PDF.js, no CDN         | The extension makes no outbound requests of its own                                                                       |
| `localResourceRoots`           | The webview reads only `lib/pdfjs/` and the folder of the open PDF                                                        |
| No document scripting          | No scripting sandbox ships, and the annotation layer renders with `enableScripting: false`                                |
| `isEvalSupported: false`       | Keeps PDF functions out of eval in PDF.js releases that honour the option; the bundled release ignores it                 |
| `CustomReadonlyEditorProvider` | The extension never writes to disk                                                                                        |
| Link filtering                 | The host opens only http(s) addresses, and it opens the address it validated                                              |
| Text kept out of markup        | Search highlights and status text use text nodes; no dynamic `innerHTML`                                                  |
| Password handling              | Never logged, never persisted                                                                                             |
| Workspace Trust                | Declared as supported: the extension runs no workspace code, and a workspace-defined zoom is checked against a fixed list |

### Content Security Policy

`buildCsp()` produces this policy, where `CSP_SOURCE` is `webview.cspSource`:

```
default-src 'none';
script-src 'nonce-NONCE' 'strict-dynamic';
worker-src blob: CSP_SOURCE;
connect-src CSP_SOURCE;
style-src 'unsafe-inline';
img-src data:;
base-uri 'none';
form-action 'none';
```

- **Scripts:**
  - The nonce gates the page's script. `'strict-dynamic'` lets that script import PDF.js modules.
- **Workers:**
  - The worker file lives on a different origin from the page, so PDF.js starts it through a blob that inherits this policy.
- **Fetches:**
  - `connect-src` lets PDF.js read the document and the worker file from the resource origin.
- **Styles:**
  - PDF.js positions text and annotation elements with inline styles, so `'unsafe-inline'` is required for styles only.
- **Base tag and forms:**
  - `base-uri 'none'` and `form-action 'none'` close two injection routes that the page never needs.
- **Images:**
  - `img-src data:` is kept as a precaution. The test documents render without it; see the decision log.

### Limits

- **`'strict-dynamic'`:**
  - Script elements that a trusted script creates are allowed. A bug that lets an attacker run code in the page could therefore add scripts. The nonce limits what the page contains, not what running code can do.
- **Undecodable images:**
  - JPEG 2000 and JBIG2 images render blank. Decoding them would need WebAssembly and a looser CSP, which is an open maintainer decision.

## PDF.js integration

- **Build:**
  - `lib/pdfjs/` holds the legacy build of PDF.js, because the modern build needs newer browser features than the Chromium of the support floor.
  - [dependencies.md](dependencies.md) explains the choice and the update procedure.
- **Exports used:**
  - `getDocument`, `GlobalWorkerOptions`, `TextLayer`, `AnnotationLayer`.
  - `PDFFindController` and `EventBus` come from the viewer package and are not bundled.
- **Worker:**
  - `GlobalWorkerOptions.workerSrc` points at the webview URI of `pdf.worker.mjs`.

## Find in document

Search uses two stages, because the viewer classes that normally provide it are not bundled.

1. **Index:**
   - After the first page renders, the page reads the text of every page and stores it per page.
   - A query typed before the index is ready runs again when the index completes.
2. **Match and highlight:**
   - A query scans the index into a flat match list.
   - After the text layer renders, the highlighter wraps matching text inside each text node in `<mark>` elements.
   - The current match gets an extra class and scrolls into view.

- **Limit:**
  - A match that spans two text runs is counted but not highlighted. The decision log records this.

## Guidelines for changes

| Kind of change                                               | Care needed                                               |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Styling, toolbar layout, shortcuts                           | Safe. Keep VS Code theme variables                        |
| CSP, nonce, `localResourceRoots`, worker setup, link opening | Needs a security review and updates to the matching tests |
| Anything that writes, edits or executes document content     | Not allowed                                               |
