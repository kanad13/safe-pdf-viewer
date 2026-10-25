# Safe PDF Viewer: agent instructions

This file is the single shared instruction file for coding agents. It stays short; the guides hold the detail.

## Key context

- **Product:**
  - A VS Code extension that opens `.pdf` files in a read-only webview.
  - PDF.js renders pages onto a canvas from a locally bundled copy.
  - The CSP is strict, nothing loads from a CDN, and PDF scripts never run.
- **Identifiers:**
  - Package name: `safe-pdf-viewer`.
  - Command and setting prefix: `safePdfViewer`.
  - View type: `safePdfViewer.pdfEditor`.
- **Source files:**
  - `src/extension.js` holds the extension host.
  - `src/webview.html` holds the webview page, styles and script.
  - `lib/pdfjs/` holds the committed PDF.js bundle. The version sits in the first line of `src/extension.js`.

## Task routing

Match the maintainer's request to a workflow in [docs/workflows.md](docs/workflows.md) and run it. Stop at the stopping point that the workflow names. The workflow column must equal a heading in that guide; `test/docs.test.js` checks it.

| If the maintainer says...                                                                 | Run workflow                  |
| :---------------------------------------------------------------------------------------- | :---------------------------- |
| "Evaluate adding X", "Is X worth it?", "Add a dependency"                                 | Evaluate a Change             |
| "Add X", "Implement X" (after approval)                                                   | Build an Approved Change      |
| "Update", "upgrade", "maintain", "dependency review", "is the repo current?"              | Maintain and Upgrade          |
| "X is broken", "fix this bug", "this PDF renders wrong"                                   | Fix a Defect                  |
| "Someone reported a vulnerability", "security report", "is this exploitable?"             | Handle a Vulnerability Report |
| "Release", "publish", "ship it"                                                           | Release                       |
| "Check for drift", "sync the repo", "are the docs accurate?"                              | Sync and Audit                |
| "Update the docs", "rewrite the README"                                                   | Change Documentation          |
| "Do the other extensions need this?", "share this change", "check the sibling extensions" | Share With Sibling Extensions |

- **No match:**
  - A question about the code or the docs gets an answer and no file changes.
  - Any other request that matches no row or several rows: name the closest workflow and ask the maintainer to confirm it.
- **Evidence:**
  - Verify claims about libraries, store rules, and behavior against the code, a command's output, or primary documentation.
  - Report a check as passed only if you ran it.
- **Shared files:**
  - After you change a file listed in [docs/sibling-extensions.md](docs/sibling-extensions.md), run Share With Sibling Extensions before you finish.

## Architecture rules

- **Structure:**
  - Keep extension logic in `src/extension.js` until it exceeds about 1500 lines.
  - Use closure state, no classes, except `SafePdfEditorProvider`, which the VS Code API requires.
  - Add no TypeScript, framework or bundler.
- **Security invariants** (weaken only with a documented security review):
  - `default-src 'none'` and nonce-gated scripts in `buildCsp()`; no external origin in `script-src`; no `unsafe-eval`.
  - `localResourceRoots` limited to `lib/pdfjs/` and the PDF's own directory.
  - `isEvalSupported: false` stays in the `getDocument()` call.
  - `CustomReadonlyEditorProvider` semantics: the extension never writes to disk.
  - Link targets reach `openExternal` only after `toExternalUrl()` accepts them (http and https).
  - Document text never becomes markup: no `innerHTML` with dynamic content.

### Security gate

Run this before you report any change to `src/`, `lib/pdfjs/`, the manifest, or a dependency as complete.

- Confirm that every security invariant above still holds in the code.
- Walk through the [security checklist for webview changes](docs/development.md#security-checklist-for-webview-changes).
- Confirm that the unit test for each invariant fails when you break that invariant on purpose.
- When an invariant must change, stop and report it to the maintainer. A weakening needs a documented security review, recorded in [docs/decisions.md](docs/decisions.md).

## Code style

- Tabs, double quotes, semicolons, Unix line endings, ES2020, CommonJS.
- JSDoc on every exported function.
- No TODO comments; track work in issues.
- Prettier and ESLint share one configuration. `src/webview.html` is excluded from Prettier.

## Git and commits

- Work on a feature branch. Never commit to `main`.
- Commits use a conventional subject plus Problem, Solution, Decisions, Implementation and Notes sections.
- Commit messages, pull requests, files and release notes carry no tool or model attribution.
- Push, tag, merge and publish only when the maintainer says so.

## Multi-file changes

- **Plan:**
  - Map which files each change touches. Group the changes into phases: configuration, code, tests, documents.
  - Keep a `WORKPLAN.md` for four or more phases and delete it when done.
- **Gate each phase:**
  - Commit, run `npm test`, run `npm run test:e2e`, build with `npm run package`, then continue.

## Testing

- `npm test` runs unit tests, ESLint and the Prettier check. It must pass with no errors and no warnings.
- `npm run test:e2e` runs the browser suite. [docs/testing.md](docs/testing.md) maps each user workflow to its evidence and lists the manual checks.
- Manual verification installs the built `.vsix`; the steps are in [docs/development.md](docs/development.md).

## Where to read more

- [docs/dependencies.md](docs/dependencies.md): version policy and the quarterly review procedure.
- [docs/testing.md](docs/testing.md): the canonical testing guide.
- [docs/architecture.md](docs/architecture.md): design and security model.
- [docs/development.md](docs/development.md): setup, workflow and release procedure.
- [docs/workflows.md](docs/workflows.md): the procedure and stopping point for each kind of request.
- [docs/sibling-extensions.md](docs/sibling-extensions.md): the other extensions published as KunalPathak, and the files they share.
- [docs/decisions.md](docs/decisions.md): ideas not built and why. It is context, not a task list; nothing in it is scheduled.
