# Safe PDF Viewer

A read-only PDF viewer for VS Code that treats every document as untrusted.

PDF files are a long-standing route for malware, and many viewers carry a lot of code to run documents. Safe PDF Viewer renders pages with a bundled copy of Mozilla's PDF.js inside a locked-down webview. It reads files and never changes them, loads nothing from the internet, and never runs a document's scripts.

## Install

1. Open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Search for `KunalPathak.safe-pdf-viewer`.
3. Select **Install**.

- **Requirements:**
  - VS Code at the version in `engines.vscode` in [package.json](package.json), or newer.
  - That version is the newest release at least a year old, so most installations qualify.

## Use

Open any `.pdf` file from the Explorer. It opens in the viewer without a command or a setting.

| Action                 | Keys                                 |
| ---------------------- | ------------------------------------ |
| Previous or next page  | `←` `→` `↑` `↓`, `PageUp` `PageDown` |
| Zoom in or out         | `+` `-`                              |
| Open the find panel    | `Ctrl+F` / `Cmd+F`                   |
| Next or previous match | `Enter` / `Shift+Enter` in the panel |
| Close the find panel   | `Escape`                             |
| Jump to a page         | Type in the page number field        |

Scrolling past the end of a page turns to the next page.

- **Setting:**
  - `safePdfViewer.defaultZoom` sets the zoom for newly opened PDFs: `fit-page` (default), `50`, `75`, `100`, `125`, `150` or `200`.

## Features

- **Reading:**
  - Page navigation by keyboard, buttons, scroll wheel or page number.
  - Fit-page zoom and fixed zoom levels from 50% to 200%.
  - The viewer returns to your page and zoom when you switch back to a tab.
- **Text:**
  - Select and copy text.
  - Find text across all pages, with a match counter and highlights.
- **Links:**
  - Internal links jump to their page.
  - External `http` and `https` links open in your system browser.
- **Protected files:**
  - Password-protected PDFs prompt for the password in a masked box.
  - A wrong password prompts again, three prompts in total.
- **Appearance:**
  - The toolbar and find panel follow your VS Code theme, including high contrast.

### Limits

- **Images:**
  - JPEG 2000 and JBIG2 images render as blank areas. Decoding them needs a looser security policy. [docs/decision-log.md](docs/decision-log.md) explains the choice.
- **Fonts:**
  - Documents that reference fonts without embedding them use your system fonts.
- **Scope:**
  - No editing, annotation, form filling, printing or media playback.

## Privacy and security

The extension makes no network requests of its own. Each layer below limits what a hostile PDF can do.

| Layer                          | What it does                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Strict Content Security Policy | A browser rule that blocks everything except the viewer's own script, which carries a fresh random token |
| No external origins            | PDF.js ships inside the extension; the policy allows no other network origin                             |
| Scoped file access             | The viewer reads only its own PDF.js files and the folder of the open PDF                                |
| No document scripts            | The scripting engine of PDF.js is not included, and forms stay disabled                                  |
| Read-only editor               | The extension never writes to disk                                                                       |
| Link filtering                 | Only `http` and `https` links open; `javascript:`, `data:` and `file:` are ignored                       |
| Passwords                      | Used once to open the file; never logged or stored                                                       |

Report vulnerabilities as described in [SECURITY.md](SECURITY.md). The security model is documented in [docs/architecture.md](docs/architecture.md).

## Contribute

- [docs/development.md](docs/development.md): setup, workflow and release procedure.
- [docs/testing.md](docs/testing.md): how each workflow is tested and which checks stay manual.
- [docs/dependencies.md](docs/dependencies.md): version policy and the quarterly review.
- [docs/architecture.md](docs/architecture.md): design and security model.
- [docs/decision-log.md](docs/decision-log.md): ideas not built, and what would reopen them.
- [AGENTS.md](AGENTS.md): instructions for coding agents.
- [CHANGELOG.md](CHANGELOG.md): version history.

The project uses the [MIT license](LICENSE). The bundled PDF.js carries the Apache License 2.0 in [lib/pdfjs/LICENSE](lib/pdfjs/LICENSE).
