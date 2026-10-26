# Sibling Extensions

This repository is one of five VS Code extensions that Kunal Pathak publishes under the publisher `KunalPathak`. The five share a release pipeline, tooling, and documentation layout. Each lives in its own repository, so an improvement made in one does not reach the others unless someone carries it across. This page names the siblings, lists what they share, and says how to carry a change.

## The extensions

| Extension                    | Repository                                                                                      | Open VSX identifier                        |
| :--------------------------- | :---------------------------------------------------------------------------------------------- | :----------------------------------------- |
| Lightweight Markdown Preview | [kanad13/lightweight-markdown-preview](https://github.com/kanad13/lightweight-markdown-preview) | `KunalPathak.lightweight-markdown-preview` |
| Markdown Presentation Tool   | [kanad13/markdown-presentation-tool](https://github.com/kanad13/markdown-presentation-tool)     | `KunalPathak.markdown-presentation-tool`   |
| Mermaid Slideshow            | [kanad13/mermaid-slideshow-extension](https://github.com/kanad13/mermaid-slideshow-extension)   | `KunalPathak.mermaid-slideshow`            |
| NotionDown                   | [kanad13/NotionDown](https://github.com/kanad13/NotionDown)                                     | `KunalPathak.notiondown`                   |
| Safe PDF Viewer              | [kanad13/safe-pdf-viewer](https://github.com/kanad13/safe-pdf-viewer)                           | `KunalPathak.safe-pdf-viewer`              |

## Shared files

Some files must be identical in every repository. Others share a purpose and differ where the extension needs it.

| File or area                                                                                   | Rule                                                                                                                        |
| :--------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/release.yml`                                                                | Identical in all five repositories.                                                                                         |
| `.github/workflows/ci.yml`                                                                     | Identical in all five, except that Safe PDF Viewer adds a browser test step.                                                |
| `.nvmrc`                                                                                       | Holds the lowest Node version that `engines.node` allows. The value differs per repository. CI fails when the two disagree. |
| `docs/workflows.md`, routing table in `AGENTS.md`                                              | Same structure and wording. Rows and steps that name this extension's own tools differ.                                     |
| `docs/sibling-extensions.md`                                                                   | Same content in all five repositories.                                                                                      |
| `eslint.config.js`, Prettier config, `.vscodeignore`, `package.json` scripts and tool versions | Aligned in intent. They differ where an extension needs a different setting.                                                |

## When to check the siblings

- **Check after you change a shared file:**
  - Any change to the files in the first two rows above must reach all five repositories.
- **Check after you improve shared practice:**
  - Examples are a new test technique, a security hardening step, a packaging rule, a tool upgrade, or a clearer documentation layout.
  - Ask whether the other extensions have the same gap.
- **Skip changes that belong to one extension:**
  - A feature, a bug fix, or a dependency used by only this extension needs no check.

## Compare a shared file with the siblings

Run this from the repository root. It prints `identical` when a sibling's `main` branch matches the local file. Change the path to compare another file.

```bash
for repo in lightweight-markdown-preview markdown-presentation-tool mermaid-slideshow-extension NotionDown safe-pdf-viewer; do
  echo "== $repo"
  curl -fsS "https://raw.githubusercontent.com/kanad13/$repo/main/.github/workflows/release.yml" \
    | diff - .github/workflows/release.yml && echo identical
done
```

## Carry a change to a sibling

- **Get the code:**
  - Ask the maintainer for the path of a local clone. Without one, run `gh repo clone kanad13/<repository>` into a scratch folder.
- **Work on a branch:**
  - Read the sibling's `AGENTS.md` first. Each repository has its own rules for tests, documentation, and the changelog.
  - Apply the change on a new branch, and run the sibling's `npm test`.
- **Stop for approval:**
  - Do not push, merge, tag, or release a sibling without the maintainer's instruction.
  - Report what changed in each sibling and which siblings need no change.

## Tools and authority

Three command-line tools are installed and signed in on the maintainer's machine. Look up each command with `--help` before you rely on this list.

- **Tools:**
  - `gh` (GitHub CLI): check with `gh auth status`.
  - `vsce` (Visual Studio Marketplace): check with `vsce verify-pat KunalPathak`.
  - `ovsx` (Open VSX): check with `ovsx verify-pat KunalPathak`, which reads the token from the `OVSX_PAT` variable. Without it, `ovsx show KunalPathak.<name>` still reads the registry.
- **Reading needs no approval:**
  - Use the tools for every GitHub, Marketplace, and Open VSX read: repository, release, issue, pull request, workflow, and registry state.
  - Do not ask the maintainer to open a web page for something a tool can print.
  - Examples: `gh release view`, `gh run list`, `gh pr view`, `vsce show KunalPathak.<name>`, `ovsx show KunalPathak.<name>`.
- **Changing state needs the maintainer's word:**
  - Merge, push, tag, and publish still happen only when the maintainer says so (see "Git and Commits" in `AGENTS.md`).
  - After the maintainer has said so, run every step with the tools and do not ask again for each command.
- **Missing tool or sign-in:**
  - Install the tool (`brew install gh`, `npm install -g @vscode/vsce ovsx`), then ask the maintainer to sign in.
  - The agent never reads, prints, stores, or pastes a token.
- **Permission prompts:**
  - This text does not change the prompts of an agent harness. In Claude Code, they come from `settings.json`, which the maintainer edits.
