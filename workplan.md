# Safe PDF Viewer — Roadmap

Single source of truth for pending work. Refer to `docs/development.md` for the release workflow and `docs/architecture.md` for security invariants.

---

## Phase 1 — Password-Protected PDFs ✅ v0.2.0

**Goal:** PDFs protected with a user password can be opened via VS Code's input box API.
**Branch:** `feat/password` (merged)

All tasks complete. The following invariants are enforced:

- Password is never logged (`console.*`), never stored in `vscode.setState`
- Re-prompt stops after 3 failed attempts
- User cancellation shows a status message without crashing

---

## Future ideas (not planned)

- Thumbnail side panel
- Outline / bookmarks panel
