# Testing guide

This is the canonical testing guide. It maps each user workflow to the test that proves it and names the checks that remain manual.

## Overview

Three layers of evidence cover the extension:

| Layer           | Command            | What it exercises                                                                                             |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Unit and static | `npm test`         | Extension host logic with a fake `vscode` module, template rendering, the package file list, ESLint, Prettier |
| Browser         | `npm run test:e2e` | The real `src/webview.html`, the bundled PDF.js and the shipped CSP, in Chromium                              |
| Manual          | see below          | The installed `.vsix` inside a real VS Code window                                                            |

`npm test` and `npm run test:e2e` both run in CI on the minimum Node version.

## How the browser suite stays faithful

- **Shipped markup:**
  - `test/e2e/fixtures/server.js` renders the page with the extension's own `renderWebviewHtml()`, so the CSP under test is the CSP that ships.
- **Two origins:**
  - The page and its resources come from different origins, as in a real webview.
  - PDF.js therefore starts its worker through a blob wrapper that inherits the CSP. A test asserts the blob worker.
- **Shim:**
  - `vscode-api-shim.js` replaces `acquireVsCodeApi` and the host's `init` message.
  - Everything the page posts is kept in `window.__posted`, so tests assert on messages.
- **Fixtures:**
  - `test/fixtures/` holds small PDFs: `plain.pdf` (three pages), `links.pdf`, `password.pdf` and `jpx-image.pdf`.
  - `test/fixtures/make-fixtures.js` regenerates the first two and documents how the others are made.
  - `examples/test.pdf` is a long real-world document used for whole-document checks.
- **Violations:**
  - `openViewer()` records `securitypolicyviolation` events and console errors. Tests that load a document assert that both lists are empty.

## Workflow coverage

| User workflow                             | Evidence                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Open a PDF and see its first page         | `render.spec.js` (pixels drawn, page count, blob worker); `extension-host.test.js` (editor setup)                                                      |
| Every page renders under the CSP          | `render.spec.js` (whole example document, no violations, no errors)                                                                                    |
| Turn pages by button, key, field or wheel | `navigation.spec.js`; `lifecycle.spec.js` (wheel cooldown with a fake clock)                                                                           |
| Keep paging during a slow render          | `navigation.spec.js` (rapid key presses end on the latest page, no error)                                                                              |
| Zoom, fit page, default zoom setting      | `zoom.spec.js`; `extension-host.test.js` (setting validation)                                                                                          |
| Resize the window                         | `lifecycle.spec.js` (debounce, fixed zoom does not re-render)                                                                                          |
| Find text, step through matches, clear    | `search.spec.js`                                                                                                                                       |
| Select text                               | `selection.spec.js`                                                                                                                                    |
| Click an external or internal link        | `links.spec.js`; `extension-host.test.js` (scheme filter, opened URL equals validated URL)                                                             |
| Open a password-protected PDF             | `password.spec.js` (success, wrong password, three attempts, cancel); `extension-host.test.js` (prompt)                                                |
| Switch away from a tab and back           | `render.spec.js` (state saved and restored, invalid zoom ignored)                                                                                      |
| Close the tab                             | `lifecycle.spec.js` (teardown without errors)                                                                                                          |
| Open a PDF with an undecodable image      | `render.spec.js` (page stays usable)                                                                                                                   |
| Install the package                       | `package.test.js` (file list, manifest pairing, bundle checks)                                                                                         |
| Security invariants                       | `webview-template.test.js` (CSP, escaping, no dynamic `innerHTML`); `extension-host.test.js` (roots, links); `package.test.js` (no eval in the bundle) |

## Remaining manual checks

Run these on the built `.vsix` before each release, on the current stable editor and on the support floor:

1. Install the package, reload the window, open `examples/test.pdf`. The first page renders.
2. Open a PDF that the browser suite cannot represent: a scanned document and one with embedded fonts.
3. Switch between a light, a dark and a high-contrast theme. The toolbar and find panel follow the theme.
4. Select text and copy it with the keyboard. Paste it into another editor.
5. Click an external link. The system browser opens the address; the editor does not navigate.
6. Open the encrypted fixture. The prompt is masked, a wrong password prompts again, Escape leaves a message.
7. Open the Developer Tools console (`Developer: Toggle Developer Tools`). It shows no CSP violation and no error.
8. Switch to another tab and back. The page and zoom return.
9. Uninstall the extension before the next iteration.

The suite cannot cover these because they need the real webview host, the clipboard, the operating system's browser or the editor's theme engine.

## Running against the floor's Chromium

The editor floor fixes the Chromium that webviews use, and that browser can lack features the current Chromium has.

1. Read the floor's Chromium major version as described in [dependencies.md](dependencies.md).
2. Find the Playwright release whose `packages/playwright-core/browsers.json` lists that version.
3. Install that release's `chromium-headless-shell` into a scratch directory with `PLAYWRIGHT_BROWSERS_PATH`. Run the install with the minimum Node version.
4. Run the suite with `CHROMIUM_FLOOR_PATH=<path to headless_shell> npm run test:e2e`. The config adds a `chromium-floor` project next to the default one.

## Conventions

- **Fakes:**
  - Shared fakes live in `test/helpers/vscode-stub.js`.
- **Timers:**
  - Lifecycle tests drive time with Playwright's clock. They dispatch `resize` by hand because viewport resizes arrive outside the fake clock.
- **New tests:**
  - Break the behavior and confirm the test fails, then restore the code.
  - Never weaken an assertion to obtain a green run.
- **Known gaps:**
  - The webview's own `javascript:` filter cannot be reached through PDF.js, which renders no anchor for such links. The host-side filter has unit tests, and `links.spec.js` asserts the missing anchor.
