# RepoNav

RepoNav is a deterministic, read-only repository evidence service for local
MCP clients. It exposes a single `repo_nav_locate` tool that turns a repository
question, search terms, and optional anchors into verified evidence, follow-up
candidates, coverage details, and next actions.

RepoNav prefers CodeGraph when the target repository is indexed and falls back
to text search when necessary. It does not modify the target repository.

## Requirements

- Node.js 20+
- `rg` (ripgrep) for the text-search fallback
- Optional: CodeGraph for indexed repository exploration

## Install and build

```powershell
git clone https://github.com/gchigoo/repo-nav.git
cd repo-nav
npm ci
npm run build
```

## Add to Codex

Register the built stdio server with Codex:

```powershell
codex mcp add repo_nav -- node <ABSOLUTE_REPO_PATH>\dist\main.js
codex mcp list
```

The server publishes one read-only MCP tool:

```text
repo_nav_locate
```

Example arguments:

```json
{
  "repoPath": "D:\\path\\to\\target-repository",
  "question": "Where is the repository evidence service token used?",
  "terms": ["REPOSITORY_EVIDENCE_SERVICE"],
  "anchors": [
    { "kind": "symbol", "value": "REPOSITORY_EVIDENCE_SERVICE" }
  ]
}
```

See [the MCP getting-started guide](docs/getting-started-mcp.md) and the
[`repo_nav_locate` reference](docs/reference/repo-nav-locate.md) for the full
contract.

## Debug CLI

```powershell
npm run repo-nav -- --help
npm run repo-nav -- debug locate --help
npm run repo-nav -- debug probe --help
npm run repo-nav -- debug golden --help
```

See [the debug CLI guide](docs/debug-cli.md) for command details and exit-code
semantics.

## Verification

```powershell
npm run build
npm run typecheck
npm test
npm run test:golden -- --all
npm run test:mcp -- --all
npm run test:docs
```

The MVP acceptance contract and evidence are documented in
[`docs/acceptance/mvp.md`](docs/acceptance/mvp.md).

## Design principles

- Read-only repository access
- Deterministic and typed output contracts
- Explicit distinction between confirmed evidence and candidates
- Bounded results with coverage and next-action metadata
- Secret-like value redaction at public output boundaries
- CodeGraph-first retrieval with a controlled fallback path
