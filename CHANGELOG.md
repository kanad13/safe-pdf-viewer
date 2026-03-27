# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-27

### Added

- SECURITY.md — vulnerability disclosure policy and reporting contact

### Changed

- README redrafted for VS Code Marketplace: user-first structure, keyboard shortcut table, cleaner feature list
- Category updated from "Other, Visualization" to "Visualization" for better marketplace discoverability

## [0.2.0] - 2026-03-27

### Added

- Password-protected PDF support: entering an incorrect or missing password now shows a VS Code input prompt (masked) instead of silently failing with "Could not load PDF."
- Re-prompt on wrong password with up to 3 attempts before giving up
- Graceful cancellation: pressing Escape shows a status message without crashing

### Security

- Password value is never logged, never stored in extension state, and discarded immediately after `getDocument()` returns

## [0.1.2] - 2026-03-27

### Changed

- Security hardening and dead-code removal

## [0.1.1] - 2026-03-27

### Fixed

- In-document search: rewrote inline search UI and exact text highlighting

## [0.1.0] - 2026-03-26

### Added
- Initial release: read-only PDF viewer using locally bundled PDF.js
- Page navigation via keyboard (arrow keys, PageUp/PageDown), scroll wheel, and toolbar buttons
- Zoom controls: fit-page, 50%–200%, +/− step buttons
- Text selection and copy
- In-document text search (Ctrl+F / Cmd+F)
- Dark and light mode support via VS Code CSS variables
- `safePdfViewer.defaultZoom` setting
- Strict Content Security Policy: nonce-gated scripts, no external origins, `worker-src blob:` only
- PDF JavaScript execution disabled (`isEvalSupported: false`)
