# Development Guide

A comprehensive guide to develop, test, and release the Safe PDF Viewer extension.

## 1. Prerequisites & Setup

### Install Global Tools

Required for development and publishing:

```bash
# VS Code CLI for publishing to marketplace
npm install -g @vscode/vsce

# GitHub CLI for creating releases
brew install gh
```

### Authenticate with Services

**Marketplace Authentication (vsce):**

1. Create a Personal Access Token at `https://dev.azure.com/<org>/_usersSettings/tokens`
2. Required scope: `Marketplace > Manage`
3. Authenticate:
   ```bash
   vsce login KunalPathak
   ```
4. Verify: `vsce ls-publishers`

**GitHub Authentication (gh):**

```bash
gh auth login
gh auth status  # Verify
```

> **Note:** If your PAT expires, run `vsce login KunalPathak` again with a fresh token.

### Local Environment Setup

```bash
# Clone the repository
git clone https://github.com/kanad13/safe-pdf-viewer.git
cd safe-pdf-viewer

# Install dependencies from lock file (reproducible builds)
npm ci

# Verify setup
npm run lint
npm run package
```

> **Why `npm ci` instead of `npm install`?** Use `npm ci` for setup and reproducibility — it installs exact versions from `package-lock.json`. Only use `npm install` when intentionally adding/upgrading dependencies; then commit the updated lock file.

**Clean reinstall (if issues occur):**

```bash
rm -rf node_modules
npm ci
```

### One-Time: Bundle PDF.js

PDF.js ships as a static local asset in `lib/pdfjs/`. This is a one-time setup step and the files are committed to the repository.

```bash
# Download the latest prebuilt PDF.js dist
# From: https://github.com/mozilla/pdf.js/releases
# Download: pdfjs-X.Y.Z-dist.zip (the "dist" variant, not "legacy")

# Extract and copy the two required files
cp pdfjs-dist/build/pdf.mjs      lib/pdfjs/pdf.mjs
cp pdfjs-dist/build/pdf.worker.mjs lib/pdfjs/pdf.worker.mjs

# Verify
ls -lh lib/pdfjs/
```

These two files are all that is needed. Do not copy the entire dist tree.

**Updating PDF.js:** Repeat the above steps with a newer release, then commit the updated files with a clear message: `chore: update PDF.js to vX.Y.Z`.

---

## 2. Feature Development Workflow

### Step 1: Create a Feature Branch

Always develop on feature branches. Never commit directly to `main`.

```bash
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**

- `feat/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring

### Step 2: Implement Changes

1. **Edit Code:** Modify `src/extension.js` and/or `src/webview.html`
2. **Code Style Requirements:**
   - Tab indentation (enforced by ESLint)
   - Use `const`/`let` only (no `var`)
   - Keep functions simple with clear JSDoc comments
   - No console logs in production code (unless explicitly for debugging)

3. **JSDoc Standards:** All exported/public functions must document purpose, parameters, return values, and side effects.

4. **Dependencies:** Avoid adding new npm dependencies. The extension ships source directly with no bundler:
   - PDF.js ships as a committed static asset in `lib/pdfjs/` — it is not an npm dep
   - If a new library is truly needed, it must also ship as a committed static asset
   - No CDN loading of any dependency

5. **Security checklist for any webview change:**
   - Does the CSP still have `default-src 'none'`?
   - Is the nonce still applied to every `<script>` tag?
   - Is `isEvalSupported: false` still set on the PDF.js worker?
   - Are `localResourceRoots` still correctly scoped (pdfjs dir + pdf file dir only)?

### Step 3: Test Locally

```bash
# Launch the extension in a dev host
# In VS Code, press F5
```

Test in the dev host:

- Open `examples/test.pdf` — it should open directly in the viewer (no command needed)
- Verify pages render correctly
- Test navigation: arrow keys, PageUp/PageDown, scroll wheel, clicking `‹` `›` arrows
- Verify page counter updates ("Page X / Y")
- Test zoom: Fit Page button, + (zoom in), − (zoom out)
- Test jump-to-page input
- Test text selection and copy (`Ctrl+C`)
- Test in-document search (`Ctrl+F`):
  - Bar opens, search input receives focus
  - Typing highlights matching spans with a yellow/orange indicator
  - Enter / ↓ button cycles forward; Shift+Enter / ↑ button cycles backward
  - Match counter shows "X of Y" or "No results"
  - Escape and the ✕ button both close the bar and clear highlights
  - Arrow-key page navigation does **not** fire while search input is focused
- Test dark theme: switch VS Code to a dark theme, verify viewer chrome updates
- Test zoom setting: change `safePdfViewer.defaultZoom` in Settings (e.g. `"100"` or `"fit-page"`), close and reopen PDF
- Check Developer Tools for errors (`Help > Toggle Developer Tools`)

### Step 4: Lint & Build

```bash
# Check for code quality issues
npm run lint

# Build package to verify no errors
npm run package
```

### Step 5: Commit & Merge

```bash
# Stage your changes
git add src/extension.js src/webview.html

# Commit with descriptive message
git commit -m "feat: add descriptive title

- Bullet point details
- More details"
```

Keep commits atomic and logical.

**Merge to main:**

```bash
git checkout main
git pull origin main
git merge --no-ff feat/your-feature-name
git push origin main
```

---

## 3. Multi-File Change Protocol

When a task touches 3+ files or requires multiple related edits:

1. **Branch first** — always work on a feature branch, never directly on `main`
2. **File-touch matrix** — map which files each change touches, then group/sequence to minimize redundant edits to the same file across commits
3. **Phase the work** — group changes into logical phases (infra/config first, then code, then tests). Never fix a file you're about to delete
4. **Gate each phase** — after each phase: commit, build `.vsix`, run tests, verify before proceeding
5. **Track in a workplan** — for 4+ phases, create a `WORKPLAN.md` (delete when done) with the matrix and checklist

---

## 4. Release Management

**Only release from `main` branch after all features are merged and tested.**

### Pre-Release Verification

Before starting, ensure:

- All features merged to `main`
- GitHub Actions build passes
- `git status` shows no uncommitted changes
- `vsce login` authenticated: run `vsce ls-publishers`
- `gh auth status` authenticated

### Step 1: Update Version Numbers

Update BOTH files:

**package.json:**

```json
"version": "X.Y.Z"
```

**package-lock.json:**

```
"version": "X.Y.Z"
```

Verify both updated:

```bash
grep '"version": "X.Y.Z"' package.json package-lock.json | wc -l
# Should output: 2
```

### Step 2: Update CHANGELOG.md

Add entry at the **very top** (after header):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature description

### Changed

- Enhancement description

### Fixed

- Bug fix description
```

**Important:**

- Use actual date (YYYY-MM-DD)
- Only include **user-facing changes**
- Exclude: dependency updates, internal refactoring, test improvements, build changes
- Only include sections with content

### Step 3: Clean Install & Verify

```bash
rm -rf node_modules
npm ci
npm run lint
echo $?  # Should output: 0
```

### Step 4: Build & Publish

```bash
# Build the .vsix
npm run package

# Publish to marketplace
npm run publish

# Create GitHub release
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <(sed -n '/## \[X.Y.Z\]/,/## \[/p' CHANGELOG.md | head -n -1)
```

### Step 5: Verify Publication

- Check the [VS Code Marketplace listing](https://marketplace.visualstudio.com/items?itemName=KunalPathak.safe-pdf-viewer)
- Install the published version in a clean VS Code instance: `code --install-extension KunalPathak.safe-pdf-viewer@X.Y.Z`
- Confirm version number in Extensions panel

---

## 5. Project Structure Reference

```
safe-pdf-viewer/
├── src/
│   ├── extension.js       # All extension host logic
│   └── webview.html       # Webview shell (PDF.js canvas + nav UI)
├── lib/
│   └── pdfjs/
│       ├── pdf.mjs        # PDF.js main module (committed static asset)
│       └── pdf.worker.mjs # PDF.js web worker (committed static asset)
├── test/
│   └── extension.test.js  # Unit tests (node:test runner)
├── examples/
│   └── test.pdf           # Test PDF with mixed content for manual testing
├── docs/
│   ├── architecture.md
│   └── development.md     # This file
├── assets/
├── package.json
├── eslint.config.js
├── jsconfig.json
└── CHANGELOG.md
```
