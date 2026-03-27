# Changelog

All notable changes to this project will be documented in this file.

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
