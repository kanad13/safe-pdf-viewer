# Decision log

This log records ideas that were considered and not built. It is not a backlog: nothing here is scheduled, and an entry reopens only when its condition is met.

Each entry states what the feature is, why it costs more than it returns today, and what would change that.

## Decode JPEG 2000 and JBIG2 images

- **Verdict:** needs the maintainer's decision (defer until then).
- **What it is:**
  - Many scanned PDFs store pages as JPEG 2000 (JPX) or JBIG2 images. PDF.js decodes them with small WebAssembly programs that ship in its `wasm/` folder.
- **Behavior:**
  - The viewer shows such images as blank areas. The page stays usable and the console prints a warning. `render.spec.js` pins this behavior with `jpx-image.pdf`.
- **Cost:**
  - Decoding needs the `wasm/` files in the package, a `wasmUrl` option, and most likely `'wasm-unsafe-eval'` in `script-src`: the worker starts from a blob and inherits the page's CSP (unverified in a real editor window).
  - `'wasm-unsafe-eval'` lets the page compile WebAssembly, and the decoders would then parse untrusted image data. That relaxes a security invariant of this extension.
  - The change needs a manual check in a real editor window.
- **Return:**
  - Scanned documents are common, and a silently blank image is a content-loss surprise.
- **Recommendation:**
  - Keep the CSP as is until a user reports blank scans. Then ship the decoders with a documented security review.
- **Reopen when:**
  - A user reports a blank scan, or PDF.js decodes these formats without WebAssembly.

## Bundle CMaps and standard font data

- **Verdict:** defer.
- **What it is:**
  - PDF.js can load character maps (for non-embedded Chinese, Japanese and Korean text) and metric-compatible substitutes for the 14 standard fonts.
- **Cost:**
  - About 2.5 MB more in the package, plus the options `cMapUrl` and `standardFontDataUrl`. Both fetches fit the existing `connect-src`.
- **Return:**
  - Documents that reference but do not embed such fonts render with system fonts or garbled glyphs. Most modern PDFs embed their fonts.
- **Reopen when:**
  - A user reports wrong glyphs from a document that does not embed its fonts.

## Count and highlight matches that span two text runs

- **Verdict:** defer.
- **What it is:**
  - The find panel counts a match across two adjacent text items, for example a word split by a style change. It cannot highlight that match, because highlights wrap text inside a single run.
- **Today:**
  - The count can exceed the number of visible highlights by a few percent (two of 27 pages differed by one match for a common word in the example document).
- **Cost:**
  - Matching on the rendered text layer replaces the index approach and changes how page jumps work.
- **Reopen when:**
  - A user reports a count that does not match what they see, or the text layer exposes a usable text model.

## Continuous scrolling

- **Verdict:** defer.
- **What it is:**
  - Show all pages in one scrolling column. The viewer shows one page at a time.
- **Cost:**
  - Page virtualization, memory management and a different search and zoom model. It is a rewrite of the render path.
- **Reopen when:**
  - Users of long documents ask for it and the one-page model is the blocker.

## Outline and thumbnail sidebar

- **Verdict:** defer.
- **What it is:**
  - A side panel with the document outline or page thumbnails.
- **Cost:**
  - Extra UI, extra rendering work per page, more surface to secure.
- **Reopen when:**
  - Long documents are a primary use and the toolbar's page field is not enough.

## Reload when the file changes on disk

- **Verdict:** defer.
- **What it is:**
  - Watch the open file and re-render when a tool such as a LaTeX build rewrites it.
- **Cost:**
  - A file watcher per open document, state restoration across reloads and handling of half-written files.
- **Reopen when:**
  - Users report editing and viewing a generated PDF side by side as a main workflow.

## Apply the default-zoom setting to open tabs

- **Verdict:** reject.
- **What it is:**
  - Re-render open viewers when `safePdfViewer.defaultZoom` changes.
- **Cost:**
  - A configuration listener and a message channel for a setting people change rarely. A new tab already uses the new value.
- **Reopen when:**
  - A second setting is added and the listener pays for itself.

## Search options (case, whole word, regular expression)

- **Verdict:** defer.
- **Cost:**
  - A larger find panel and more states to test, for features most readers of PDFs do not use.
- **Reopen when:**
  - Users ask for them.

## Remove `img-src data:` from the CSP

- **Verdict:** defer.
- **What it is:**
  - The policy allows `data:` images. Every fixture and the example document render without that directive.
- **Cost:**
  - Removing it tightens the policy, but a document feature that draws through a `data:` image would break with no test to warn us.
- **Reopen when:**
  - A broader corpus of documents renders cleanly without it.

## Replace `'strict-dynamic'` with an explicit origin allow-list

- **Verdict:** defer.
- **What it is:**
  - With `'strict-dynamic'`, scripts that a trusted script creates may run, which lets PDF.js import its modules. The alternative allows the extension's resource origin in `script-src`.
- **Cost:**
  - The change affects how PDF.js starts its worker and needs a real-window check. The nonce still gates every script the page contains.
- **Reopen when:**
  - A real-window run shows the allow-list works for module imports and the worker.

## Printing, forms, annotations, embedded media

- **Verdict:** reject.
- **Why:**
  - The extension is read-only by design. Each feature widens the attack surface or needs operating system support outside the scope.

## Telemetry

- **Verdict:** reject.
- **Why:**
  - The extension makes no network requests and its privacy statement depends on that.

## Run the browser suite on the floor's Chromium in CI

- **Verdict:** defer.
- **What it is:**
  - The suite supports a second browser project (`CHROMIUM_FLOOR_PATH`), but CI runs only the current Chromium.
- **Cost:**
  - CI would download a pinned old browser build on every run, and that build must be re-pinned at each floor change.
- **Reopen when:**
  - A regression ships that only the floor's Chromium shows.
