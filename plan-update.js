const fs = require('fs');
let content = fs.readFileSync('plan.md', 'utf8');

// Phase 1 to Phase 3 are complete
content = content.replace(
  /- \[ \] Write unit tests for `getWebviewContent\(\)` in `test\/extension.test.js`/g,
  '- [x] Write unit tests for `getWebviewContent()` in `test/extension.test.js`'
);
content = content.replace(
  /- \[ \] Verify CSP header in rendered HTML/g,
  '- [x] Verify CSP header in rendered HTML'
);

content = content.replace(
  /### Tasks\n\n- \[ \] Create branch `feat\/navigation` from `main`\n- \[ \] Manually verify all navigation paths \(see Manual Tests below\)\n- \[ \] Confirm `npm test` still passes \(no regressions\)\n- \[ \] Merge to `main`\n- \[ \] Unit tests \(no new pure functions to add — nav logic is webview-side\):\n  - `getNonce\(\)` — verify still passes\n  - `getDefaultZoom\(\)` — verify still passes/g,
  '### Tasks\n\n- [x] Create branch `feat/navigation` from `main`\n- [x] Manually verify all navigation paths\n- [x] Confirm `npm test` still passes\n- [x] Merge to `main`\n- [x] Unit tests pass (getNonce, getDefaultZoom)'
);

content = content.replace(
  /### Tasks\n\n- \[ \] Create branch `feat\/zoom` from `main`\n- \[ \] Add `window\.addEventListener\("resize", \.\.\.\)` in `src\/webview.html`[\s\S]*?- \[ \] Unit tests: confirm `getDefaultZoom\(\)`/g,
  '### Tasks\n\n- [x] Create branch `feat/zoom` from `main`\n- [x] Add high-DPI scaling (`window.devicePixelRatio`)\n- [x] Add `window.addEventListener("resize", ...)` with debounce\n- [x] Unit tests: confirm `getDefaultZoom()`'
);

content = content.replace(
  /### Tasks\n\n- \[ \] Create branch `feat\/theme-polish` from `main`\n- \[ \] Add `onDidChangeActiveColorTheme` listener[\s\S]*?- \[ \] Replace the raw resize handler[\s\S]*?- \[ \] No new unit tests required/g,
  '### Tasks\n\n- [x] Create branch `feat/theme-polish` from `main`\n- [x] ~Add `onDidChangeActiveColorTheme` listener~ (Skipped to avoid destroying PDF state—CSS vars automatically handle VS Code themes without reloading HTML)\n- [x] Debounced resize handler (completed during DPI phase)\n- [x] Added polyfills for `getOrInsertComputed` and `withResolvers` for VS Code WebView compatibility.'
);

// Add Resource Cleanup phase
const resourceCleanup = `
---

## Phase 4.5 — Resource & Memory Cleanup

**Goal:** Ensure closing PDF tabs completely frees up memory resources.

**Branch:** \`feat/memory-cleanup\`

### Tasks

- [ ] In \`src/extension.js\`, inside \`resolveCustomEditor\`, listen for \`webviewPanel.onDidDispose\`
- [ ] Post a message to \`webview.html\` (e.g., \`{ type: "dispose" }\`) before the panel is fully destroyed to call \`pdfDoc.destroy()\` (if possible based on timings)
- [ ] Alternatively, handle proper disposal of \`PDF.js\` within the webview's \`unload\` or \`pagehide\` equivalent
- [ ] Ensure any unresolved promises or workers are cleanly terminated

### Exit Gate
- \`npm test\` passes
- Memory verification: opening/closing many PDFs doesn't leak memory in Activity Monitor
- Commit and merge: \`feat: resource cleanup\`
`;

content = content.replace(/## Phase 5 — Text Layer/g, resourceCleanup + '\n## Phase 5 — Text Layer');

fs.writeFileSync('plan.md', content, 'utf8');
console.log('Updated plan.md');
