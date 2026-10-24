# Dependency guide

This guide holds policies and procedures only. Version numbers live in `package.json`, `package-lock.json` and the version note on the first line of `src/extension.js`; this guide names those files and never repeats the numbers.

## Overview

The project has three groups of dependencies:

| Group                    | Where it lives                                | How it is versioned                      |
| ------------------------ | --------------------------------------------- | ---------------------------------------- |
| Bundled runtime          | `lib/pdfjs/`, committed to the repository     | One version, noted in `src/extension.js` |
| Runtime-loaded libraries | None. The extension loads nothing at run time | Not applicable                           |
| Tooling                  | `devDependencies` in `package.json`           | Caret range plus the committed lockfile  |

The extension has no production npm dependencies. The production audit therefore covers an empty tree and stays clean; the full audit covers tooling.

## Version selection policy

A version qualifies only when it satisfies every rule:

- **Channel:**
  - It is on the stable channel (no alpha, beta, rc, canary, next, nightly).
- **Line:**
  - It belongs to the newest major line that still receives fixes.
  - A line with no release for 12 months is abandoned unless the project declares it complete.
- **Age:**
  - A new major version is at least 30 days old.
  - A minor or patch version is at least 14 days old.
- **Advisories:**
  - The production dependency tree has no known advisories.
- **Compatibility:**
  - It runs on the current stable editor, on the support floor, and on the minimum Node version.
  - Its documented browser baseline is met by the Chromium that ships with the support floor.

## Bundled PDF.js

- **Build choice:**
  - Use the legacy build when the modern build does not run on the floor's Chromium.
  - Check by running the browser suite against that Chromium (see [testing.md](testing.md)).
  - The package test confirms the legacy build's polyfill marker.
- **Files:**
  - Copy only `pdf.mjs` and `pdf.worker.mjs` from the chosen build, plus `LICENSE`.
  - Do not copy source maps, the scripting sandbox, `cmaps`, `standard_fonts` or `wasm`. The decision log records why.
- **Configuration:**
  - Use library defaults.
  - Override a setting only for security, for matching the editor theme, or for aligning syntax with the extraction code.
  - Never override a library's visual defaults.

## Editor support policy

- **Targets:**
  - Test on the current stable editor release. Insiders builds are not a target.
- **Floor:**
  - `engines.vscode` is the newest editor release that is at least 12 months old.
  - `@types/vscode` is pinned to exactly that version.
  - Move both together at each quarterly review. A package test checks that they agree.
- **Forks:**
  - Before raising the floor, check the base version of every editor fork the README advertises.
  - A floor above a fork's base blocks installation there.
  - Present that trade-off to the maintainer when the floor would exclude a named fork.
- **Chromium:**
  - The floor release fixes the Chromium version that webviews run on. Read it from the editor's repository: `.npmrc` at the release tag names the Electron version, and Electron's release notes name its Chromium.

## Node and tooling policy

- **Node floor:**
  - `engines.node` is the lowest Node version that every tool accepts and that is still supported upstream.
  - CI and the pre-release check run on exactly that version.
- **Types:**
  - `@types/node` follows the Node floor's major version.
- **Build tools:**
  - Build tools stay on their current major version unless an advisory or an engine requirement forces a change.
- **Registry packages:**
  - Use a caret range and the committed lockfile.
- **Overrides:**
  - Add a package override only when no upgrade path clears an advisory.
  - Re-test each override at every review and remove it when the audit is clean without it.
- **CDN libraries:**
  - Libraries loaded at run time from a CDN use exact `x.y.z` versions. Never use a floating or major-only tag. The extension currently loads none.

## Quarterly review procedure

1. Record the date. List each dependency in the three groups above.
2. Look up the current stable versions and release dates in the registry (`npm view <package> time`).
3. Apply the selection policy to every item in the same way.
4. Recompute the editor floor from the release dates. Check advertised forks.
5. Run `npm audit --omit=dev` and `npm audit`. Apply in-range updates, then `npm audit fix`.
6. For a PDF.js change, copy the files, update the version note, and run the browser suite on the floor's Chromium and on the current one.
7. Check a version change in a real browser against `examples/test.pdf`, in a light and a dark theme.
8. Run `npm test`, `npm run test:e2e` and `npm run package` on the Node floor.
9. Commit dependencies separately from code. Describe the reasoning for each decision in the commit body.

## Security limits that follow from these policies

- **Bundled code:**
  - PDF.js runs on every document the user opens. A PDF.js advisory is a security issue for this extension even though the production audit stays empty.
  - Watch the PDF.js release notes and security advisories at each review.
- **Content Security Policy:**
  - Do not loosen the CSP to silence a console message or to enable a decoder. See the decision log for the open question about WebAssembly decoders.
- **Tooling:**
  - Tooling advisories do not reach users, but a compromised build tool could. Keep the lockfile committed and review its diff.
