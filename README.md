# RepoNav

RepoNav is a deterministic, read-only repository evidence service for local
MCP clients. It exposes a single `repo_nav_locate` tool that turns a repository
question, search terms, and optional anchors into verified evidence, follow-up
candidates, coverage details, and next actions.

RepoNav prefers CodeGraph when the target repository is indexed and falls back
to text search when necessary. It does not modify the target repository.

The repository now contains the `2.0.0` candidate implementation: canonical v2
execution facts are the production authority, snapshot revalidation uses the
selected conditional-digest policy, and the legacy package subpath is removed.
Publishing and release tagging remain owner-controlled actions. See
[the current project status](docs/project-status.md).

## Requirements

- Node.js `^22.0.0 || ^24.0.0`
- `rg` (ripgrep) for the text-search fallback
- Optional: CodeGraph for indexed repository exploration

## Install

```powershell
npm i -g repo-nav@2.0.0
```

## MCP host configuration

After install, register the stdio MCP server (`repo-nav-mcp`):

```json
{
  "command": "repo-nav-mcp"
}
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
  "anchors": [{ "kind": "symbol", "value": "REPOSITORY_EVIDENCE_SERVICE" }]
}
```

See [the MCP getting-started guide](docs/getting-started-mcp.md) and the
[`repo_nav_locate` reference](docs/reference/repo-nav-locate.md) for the full
contract.

## Debug CLI

The global install exposes `repo-nav`:

```powershell
repo-nav --help
repo-nav debug locate --help
repo-nav debug probe --help
```

See [the debug CLI guide](docs/debug-cli.md) for command details and exit-code
semantics.

## Programmatic API

Root package exports (`repo-nav`) expose the v2 request/result contract and
application helpers. The current public export map is:

| Import                  | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `repo-nav`              | v2 request/result contracts and application helpers |
| `repo-nav/backends`     | `RipgrepBackend` and `CodeGraphBackend`             |
| `repo-nav/node`         | `NodeRepositoryReader` and `NodeSafeProcessRunner`  |
| `repo-nav/advanced`     | advanced DI tokens and CodeGraph planning helpers   |
| `repo-nav/package.json` | package metadata                                    |

The root still re-exports the approved deprecated adapter symbols; new code
should import them from the dedicated subpaths. `repo-nav/advanced` is public but
is not the preferred high-level API. `repo-nav/legacy-v1` is no longer exported
in `2.0.0`. Deep imports outside the export map are unsupported.

## Development from source

```powershell
git clone https://github.com/gchigoo/repo-nav.git
cd repo-nav
npm ci
npm run build
```

Register a local stdio server with Codex:

```powershell
codex mcp add repo_nav -- node <ABSOLUTE_REPO_PATH>\dist\main.js
codex mcp list
```

Golden regressions run from a source checkout via `npm run test:golden` only.

## Verification

```powershell
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:golden -- --all
npm run test:mcp:built -- --all
npm run test:docs:built
npm run test:platform
node tools/release/check-legacy-subpath-absence.mjs --workspace .
```

`npm run test:integration:codegraph` is a separate live integration surface and
requires CodeGraph `1.1.6` on `PATH`. Package and release-oriented checks are
listed in [`docs/acceptance/mvp.md`](docs/acceptance/mvp.md). The current CI
matrix and remaining hardening work are summarized in
[`docs/project-status.md`](docs/project-status.md).

## Design principles

- Read-only repository access
- Deterministic and typed output contracts
- Explicit distinction between confirmed evidence and candidates
- Bounded results with coverage and next-action metadata
- Secret-like value redaction at public output boundaries
- CodeGraph-first retrieval with a controlled fallback path
