# Development guide

This guide covers setup, the daily workflow, manual testing and the release procedure.

## Prerequisites

- **Node:**
  - Use the version in `engines.node` in `package.json` or newer.
- **Git:**
  - Work on a feature branch. Never commit to `main`.
- **Release tools (maintainer only):**
  - A Marketplace publisher login for `vsce`.
  - The GitHub CLI (`gh`) for hosted releases.

## Setup

```bash
git clone https://github.com/kanad13/safe-pdf-viewer.git
cd safe-pdf-viewer
npm ci
npm test
npx playwright install chromium
npm run test:e2e
```

- **Why `npm ci`:**
  - It installs the exact versions in `package-lock.json`. Use `npm install` only to change dependencies, and commit the lockfile with the change.

## Commands

| Command            | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `npm test`         | Unit tests, ESLint, Prettier check. Must pass with no warnings |
| `npm run test:e2e` | Browser tests against the real webview page and bundled PDF.js |
| `npm run format`   | Rewrite files with Prettier                                    |
| `npm run package`  | Build `safe-pdf-viewer-<version>.vsix` in the repository root  |

## Daily workflow

1. **Branch:**
   - `git checkout -b feat/<name>` (or `fix/`, `docs/`, `chore/`).
2. **Change:**
   - Edit `src/extension.js` and `src/webview.html`.
   - Follow the style and security rules in [AGENTS.md](../AGENTS.md).
   - Add or change tests with the code. [testing.md](testing.md) lists where each workflow is covered.
3. **Check:**
   - Run `npm test` and `npm run test:e2e`.
   - For a change to rendering or dependencies, also run the suite on the floor's Chromium (see [testing.md](testing.md)).
4. **Commit:**
   - Use a conventional subject and the Problem, Solution, Decisions, Implementation, Notes body.

### Security checklist for webview changes

- The CSP still starts with `default-src 'none'`, and every script tag carries the nonce.
- `localResourceRoots` still lists `lib/pdfjs/` and the PDF's directory only.
- Document text never reaches `innerHTML`.
- Link targets pass `toExternalUrl()` before `openExternal`.
- The unit tests for these points still fail when you break each point on purpose.

## Manual testing with a local package

1. Run `npm run package`.
2. In VS Code, open the Extensions view, choose the `···` menu, then **Install from VSIX…** and select the file.
3. Choose **Reload Window** when prompted.
4. Work through the manual checks in [testing.md](testing.md), starting with `examples/test.pdf`.
5. Uninstall the extension before the next iteration.

## Updating PDF.js and other dependencies

Follow [dependencies.md](dependencies.md). It defines which versions qualify, how to choose the PDF.js build and how to run the quarterly review.

## Release procedure

Release only from `main`, only when the maintainer says so, and only after the maintainer confirms the built package works.

1. **Version:**
   - Choose the bump by semantic versioning from the user-visible changes.
   - Update `package.json`, `package-lock.json` and `CHANGELOG.md` together.
   - List only user-facing changes in the changelog.
2. **Store checks:**
   - The icon is square and between 128 and 1024 pixels wide. The package test enforces this; `vsce publish` rejects larger icons.
   - `npx vsce ls` lists no development files. The package test enforces this.
   - `engines.vscode` and the `@types/vscode` pin agree. The package test enforces this.
3. **Clean verification:**
   ```bash
   rm -rf node_modules
   npm ci
   npm test
   npm run test:e2e
   npm audit --omit=dev
   npm run package
   ```
4. **Merge:**
   - Merge the branch into `main` with a merge commit.
   - Run `npm test` on the merged result and confirm CI passes on `main`.
5. **Tag and publish:**
   - Tag the exact commit that is published.
   - Push `main` and the tag, then run `npm run publish` with the existing `vsce` login.
   - Create the hosted release with `gh release create vX.Y.Z` and attach the `.vsix`.
6. **Verify:**
   - The Marketplace listing shows the new version (allow time for propagation).
   - The hosted release exists with its asset.
   - CI is green.

## Project structure

```
safe-pdf-viewer/
├── src/
│   ├── extension.js        # Extension host
│   └── webview.html        # Webview page: toolbar, find panel, styles, script
├── lib/pdfjs/              # Committed PDF.js bundle and its license
├── test/
│   ├── *.test.js           # Unit and static tests (node:test)
│   ├── helpers/            # Shared fake of the vscode module
│   ├── fixtures/           # Small PDFs and their generator
│   └── e2e/                # Playwright specs, server and shim
├── examples/test.pdf       # Long real-world document for manual and whole-document checks
├── docs/                   # Guides and the decision log
├── .github/workflows/      # CI
└── AGENTS.md               # Agent instructions
```
