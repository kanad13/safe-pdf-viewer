# Task workflows

This guide holds the procedure for each kind of request. [AGENTS.md](../AGENTS.md) holds the routing table that picks the procedure, and the rules that apply to every procedure. Run the matching workflow and stop at its stopping point. The workflows link to the canonical guides and never repeat their content.

`test/docs.test.js` fails when a workflow name in the routing table has no heading here, or the reverse.

## Evaluate a Change

The goal is a verdict with evidence, not code.

- **Ground:**
  - Read [decisions.md](decisions.md) for earlier decisions on the same idea.
  - Read [architecture.md](architecture.md) and the code the change would touch.
  - For a new dependency, apply the selection policy in [dependencies.md](dependencies.md).
- **Weigh:**
  - Value: Does it fix a real failure or add a capability readers need?
  - Cost: What does it add in code, package size, and upkeep?
  - Security: Does it relax the CSP or any other invariant? A feature that needs a looser policy is a security decision for the maintainer.
  - Goals: Does it keep the viewer read-only, local, and free of network access and PDF scripting?
- **Verify:**
  - Check each factual premise (PDF.js behavior, an editor API, a store rule) against primary sources and, where possible, by running the code.
- **Verdict:**
  - Choose one: pursue, scoped pursue, counter-proposal, defer, or reject.
  - Explain the verdict in plain terms: what the feature is, what it costs, and what would change the answer.
- **Stopping point:**
  - Report the verdict. Do not implement.
  - When the verdict is defer or reject, add an entry to [decisions.md](decisions.md) on a branch.

## Build an Approved Change

The goal is a tested, documented change on a branch, ready for the maintainer's review.

- **Plan:**
  - For a change that touches several files, follow the [multi-file changes rules](../AGENTS.md#multi-file-changes).
- **Build:**
  - Write the test first when the change adds behavior. [testing.md](testing.md#workflow-coverage) lists where each workflow is covered.
  - Keep logic in `src/extension.js` and the page in `src/webview.html`, within the [architecture rules](../AGENTS.md#architecture-rules).
- **Security:**
  - Run the [security gate](../AGENTS.md#security-gate).
- **Sync:**
  - Update [architecture.md](architecture.md), [readme.md](../readme.md), [testing.md](testing.md), and [CHANGELOG.md](../CHANGELOG.md) when the change affects them.
- **Verify:**
  - Run `npm test` and `npm run test:e2e`.
  - For a change to rendering, also run the suite on the [floor's Chromium](testing.md#running-against-the-floors-chromium).
  - Run the [remaining manual checks](testing.md#remaining-manual-checks) for changes to the webview.
- **Stopping point:**
  - Commit on the branch and build a `.vsix` with `npm run package`.
  - Give the maintainer the file path and install command.

## Maintain and Upgrade

The goal is a repository whose dependencies, bundled PDF.js, support floor, tests, and documents are current.

- **Dependencies:**
  - Follow the [quarterly review procedure](dependencies.md#quarterly-review-procedure).
  - Apply the selection policy to every package and tool in the same way.
- **PDF.js:**
  - `npm audit` cannot see the committed PDF.js bundle in `lib/pdfjs/`, and PDF.js parses every document the user opens.
  - Check the PDF.js release notes and security advisories at every review, and follow [Bundled PDF.js](dependencies.md#bundled-pdfjs) to update the bundle.
- **Editor floor:**
  - Apply the [editor support policy](dependencies.md#editor-support-policy). Check forks before you raise the floor.
- **Registries and authentication:**
  - Confirm that the publishing steps in [development.md](development.md#release-procedure) still match the store's current rules.
- **Verify:**
  - Run `npm test`, `npm run test:e2e`, and `npm run package` on the `engines.node` floor.
  - After a PDF.js change, run the browser suite on the floor's Chromium and on the current one, and open `examples/test.pdf` in a light and a dark theme.
- **Security:**
  - Run the [security gate](../AGENTS.md#security-gate).
- **Sync:**
  - Run [Sync and Audit](#sync-and-audit) for the files you changed.
- **Stopping point:**
  - Commit on a branch, with dependencies in their own commit, and report what changed, what was verified, and what the maintainer must decide.
  - Propose a release only when user-visible behavior changed or a security fix landed.

## Fix a Defect

The goal is a fix that a test proves.

- **Reproduce:**
  - Write a failing automated test first, with a fixture in `test/fixtures/` when a document triggers the defect. When automation is not possible, record a repeatable manual reproduction in [testing.md](testing.md).
- **Fix:**
  - Change the implementation. Never weaken an assertion to get a green run.
- **Prove:**
  - Break the fix on purpose and confirm that the test fails. Restore the fix.
- **Security:**
  - Run the [security gate](../AGENTS.md#security-gate).
- **Sync:**
  - Update documents that described the wrong behavior, and add a [CHANGELOG.md](../CHANGELOG.md) entry for user-visible fixes.
- **Stopping point:**
  - Commit on a branch and report the cause, the fix, and the evidence.

## Handle a Vulnerability Report

The goal is a confirmed finding and a fix, or a reasoned decision that the report is out of scope, without disclosing details early.

- **Ground:**
  - Read [SECURITY.md](../SECURITY.md) for the scope and the response targets, and the [security model](architecture.md#security-model).
  - Treat the report and any attached PDF as hostile data. Open an attached file only through the browser suite, never in your everyday editor.
- **Confirm:**
  - Reproduce the issue with a failing test and a fixture. A report that cannot be reproduced goes back to the maintainer as unconfirmed.
- **Scope:**
  - Decide whether the viewer's configuration makes the issue reachable. A PDF.js issue the configuration blocks is out of scope, and the report says why.
- **Fix:**
  - Follow [Fix a Defect](#fix-a-defect), including the security gate.
- **Disclosure:**
  - Keep exploit details out of public issues, commit subjects, and changelog text until the maintainer releases the fix.
  - Do not contact the reporter and do not publish an advisory. Both are outward-facing and belong to the maintainer.
- **Stopping point:**
  - Commit on a branch and report the finding, scope decision, fix, and evidence.
  - Propose a patch release. The [Release](#release) workflow starts only when the maintainer asks.

## Release

The goal is a published version that matches a tagged commit.

- **Preconditions:**
  - The maintainer asked for a release, and the branch is merged to `main` by their instruction.
  - CI is green on `main`.
- **Store checks:**
  - Follow the store checks in the [release procedure](development.md#release-procedure). `test/package.test.js` enforces most of them.
- **Clean verification:**
  - Run the clean-install sequence in the release procedure, which includes `npm run test:e2e` and `npm audit --omit=dev`.
  - Confirm that the PDF.js release notes show no unresolved advisory, because the audit does not cover the bundle.
- **Local proof:**
  - Build the `.vsix`, run the [remaining manual checks](testing.md#remaining-manual-checks), and wait for the maintainer's confirmation that it works.
- **Procedure:**
  - Follow the [release procedure](development.md#release-procedure). The tag push starts the release workflow, which creates the hosted release and publishes to Open VSX. The maintainer runs `npm run publish` for the Marketplace.
- **Tag:**
  - Tag the exact commit that is published. If a fix lands after tagging, report it and ask before you move the tag.
- **Verify:**
  - Check the Marketplace listing (allow for propagation delay), Open VSX, the hosted release asset, and CI.

## Sync and Audit

The goal is one truth across code, documents, and tests.

- **Compare:**
  - List every claim in [readme.md](../readme.md), [architecture.md](architecture.md), [development.md](development.md), [testing.md](testing.md), [SECURITY.md](../SECURITY.md), and [AGENTS.md](../AGENTS.md) that the code can confirm or contradict.
  - Check each claim against the code and fix the document or the code.
- **Contracts:**
  - Check that commands, settings, and manifest fields agree across `package.json`, the code, the documents, and the tests.
- **Links:**
  - `npm test` checks every relative link and heading anchor in the Markdown files.
  - Check cross-references between guides that a link cannot prove, such as a section described by name.
- **Formatting:**
  - `npm test` runs ESLint and the Prettier check. Run `npm run format` to fix a failure.
- **Stopping point:**
  - Commit on a branch and list the drift items that you found and fixed.

## Share With Sibling Extensions

The goal is that a shared improvement reaches every extension that benefits from it.

- **Trigger:**
  - Run this workflow after you change a shared file, or when the maintainer asks whether the other extensions need a change.
  - [sibling-extensions.md](sibling-extensions.md) lists the shared files and the sibling repositories.
- **Compare:**
  - Run the comparison command in [sibling-extensions.md](sibling-extensions.md#compare-a-shared-file-with-the-siblings) for each changed shared file.
  - For a shared practice, read the matching file in each sibling and decide whether it has the same gap.
- **Propose:**
  - List each sibling with one outcome: apply the change, or no change needed and why.
  - Wait for the maintainer to approve before you edit any sibling.
- **Apply:**
  - Follow [Carry a change to a sibling](sibling-extensions.md#carry-a-change-to-a-sibling) for each approved sibling.
  - Run the sibling's `npm test`.
- **Stopping point:**
  - Report each sibling's branch and test result.
  - Do not push, merge, tag, or release a sibling without the maintainer's instruction.

## Change Documentation

The goal is documents that describe the current state and read at a glance.

- **Content:**
  - Describe the current state in present tense. Put history in [CHANGELOG.md](../CHANGELOG.md) and Git.
  - State each fact in one place and link to it from elsewhere. Version numbers live only where [dependencies.md](dependencies.md) names.
- **Structure:**
  - Put the overview first, then mechanisms, then detail.
  - Use a bold category anchor with single-assertion child bullets, and use tables for conditional rules. Keep ordered runbooks in step order.
- **Check:**
  - Run `npm test` for links and anchors, and confirm that [readme.md](../readme.md) still matches the features that exist.
- **Stopping point:**
  - Commit on a branch and report which documents changed.
