# Safe PDF Viewer: read PDFs in VS Code without running them

**Open a PDF in VS Code and know that it cannot act on your machine.** The viewer is read-only, loads nothing from the internet, and never runs a document's scripts. Open the file and read it.

![A PDF report open in Safe PDF Viewer with a dark VS Code theme, showing a page toolbar, page number, and zoom buttons](https://raw.githubusercontent.com/kanad13/safe-pdf-viewer/main/assets/readme-hero-dark.png)

- **Safe by design:** PDF files are a long-standing route for malware. This viewer renders every document as untrusted, inside a locked-down panel.
- **Read-only:** it never writes to disk, and there is no editing or form filling to go wrong.
- **Offline:** it makes no network requests of its own. The renderer, Mozilla's PDF.js, ships inside the extension.
- **Matches your theme:** the toolbar and find panel follow your light, dark, or high-contrast VS Code theme.
- **Nothing to set up:** open a `.pdf` file from the Explorer and it opens in the viewer. There is one setting, for the starting zoom.

## Read at your own pace

Turn pages with the arrow keys, `PageUp` and `PageDown`, the toolbar buttons, or the scroll wheel. Scrolling past the end of a page turns to the next page. Type in the page number field to jump. Zoom with `+` and `-`, or choose **Fit Page**. The viewer returns to your page and zoom when you switch back to its tab.

![The same report zoomed in so that the text fills more of the viewer, in a dark VS Code theme](https://raw.githubusercontent.com/kanad13/safe-pdf-viewer/main/assets/readme-zoom-dark.png)

## Find text across the whole document

Press `Ctrl+F` (`Cmd+F` on macOS). The find panel counts matches on every page, highlights those on the current page, and steps through them with `Enter` and `Shift+Enter`. `Escape` closes it.

![The find panel showing 2 of 6 matches for the word latency, with the matches highlighted on the page in a light theme](https://raw.githubusercontent.com/kanad13/safe-pdf-viewer/main/assets/readme-find-light.png)

## Follow links safely

Links inside the document jump to their page. A link to a web address opens in your system browser, but only if it starts with `http` or `https`. Links that use `javascript:`, `data:`, `file:` or any other scheme do nothing.

## Light and dark

The toolbar and find panel follow the active VS Code color theme.

| Dark theme                                                                                                                                        | Light theme                                                                                                                                          |
| :------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![A PDF page in the viewer with a dark VS Code theme](https://raw.githubusercontent.com/kanad13/safe-pdf-viewer/main/assets/readme-hero-dark.png) | ![A PDF page in the viewer with a light VS Code theme](https://raw.githubusercontent.com/kanad13/safe-pdf-viewer/main/assets/readme-theme-light.png) |

## Password-protected files

A protected PDF asks for its password in a masked box. A wrong password prompts again, three prompts in total. The password opens the file once. It is never logged or stored.

## Install

- **VS Code:** open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`), search for `KunalPathak.safe-pdf-viewer`, and select **Install**.
- **Cursor, VSCodium, and other forks:** install `KunalPathak.safe-pdf-viewer` from [Open VSX](https://open-vsx.org/extension/KunalPathak/safe-pdf-viewer).
- **From a file:** download the `.vsix` from the [GitHub releases](https://github.com/kanad13/safe-pdf-viewer/releases) and run **Extensions: Install from VSIX...**.

**Requirements:** VS Code at the version in `engines.vscode` in [package.json](package.json), or newer. That version is the newest release at least a year old, so most installations qualify.

## Use

Open any `.pdf` file from the Explorer. It opens in the viewer without a command.

| Action                 | Keys                                 |
| ---------------------- | ------------------------------------ |
| Previous or next page  | `←` `→` `↑` `↓`, `PageUp` `PageDown` |
| Zoom in or out         | `+` `-`                              |
| Open the find panel    | `Ctrl+F` / `Cmd+F`                   |
| Next or previous match | `Enter` / `Shift+Enter` in the panel |
| Close the find panel   | `Escape`                             |
| Jump to a page         | Type in the page number field        |

The setting `safePdfViewer.defaultZoom` sets the zoom for newly opened PDFs: `fit-page` (default), `50`, `75`, `100`, `125`, `150` or `200`.

## What to expect

- JPEG 2000 and JBIG2 images show as blank areas. Decoding them needs a looser security policy. [decisions.md](docs/decisions.md) explains the choice.
- A document that uses fonts it does not embed falls back to your system fonts.
- A match that spans two text runs, such as a word split by a style change, is counted but not highlighted.
- There is no editing, annotation, form filling, printing, or media playback.
- It works in Restricted Mode, so PDFs open in workspaces you have not marked as trusted.

## Privacy and security

The extension makes no network requests of its own and collects no data. Each layer below limits what a hostile PDF can do.

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
- [docs/workflows.md](docs/workflows.md): the procedure and stopping point for each kind of request.
- [docs/sibling-extensions.md](docs/sibling-extensions.md): the other extensions published as KunalPathak, and the files they share.
- [docs/decisions.md](docs/decisions.md): ideas not built, and what would reopen them.
- [AGENTS.md](AGENTS.md): instructions for coding agents.
- [CHANGELOG.md](CHANGELOG.md): version history.

The project uses the [MIT license](LICENSE). The bundled PDF.js carries the Apache License 2.0 in [lib/pdfjs/LICENSE](lib/pdfjs/LICENSE).
