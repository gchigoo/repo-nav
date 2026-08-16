# Migration: locate schema v1 to v2

## Summary

Production locate output is schema `2.0` only. There is no dual production schema, negotiation flag, or v1 fallback.

The current package line is `2.0.0`. The atomic cutover removed the public `repo-nav/legacy-v1` compatibility subpath while retaining the root and approved adapter surfaces.

## Breaking changes

| Area                 | v1                                                 | v2                                                    |
| -------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| schemaVersion        | `1.0`                                              | `2.0`                                                 |
| success shape        | `evidence` object with status/coverage/nextActions | `ok:true` result with v2 evidence owners              |
| tool errors          | v1 public error policy / redactor path             | four fixed codes via trusted v2 factory               |
| IDs / ordinals       | v1 discovery keys                                  | v2 registration ordinals                              |
| file anchors         | Windows backslash accepted in some paths           | POSIX relative only; backslash rejected               |
| unsupported language | mixed into coverage                                | capability owner fragment                             |
| Node engines         | pre-v2 range (outside current support)             | `^22.0.0 \|\| ^24.0.0`                                |
| package exports      | deep/private imports possible                      | root v2-only + explicit retained adapter subpaths     |
| CLI Golden           | `repo-nav debug golden`                            | removed; use `npm run test:golden` in source checkout |

## Package exports

- `repo-nav` (root): v2 locate contracts, request parsers, application helpers, and the approved deprecated adapter re-exports retained across the breaking cutover.
- `repo-nav/backends`: `RipgrepBackend` and `CodeGraphBackend`.
- `repo-nav/node`: `NodeRepositoryReader` and `NodeSafeProcessRunner`.
- `repo-nav/advanced`: advanced dependency-injection tokens and CodeGraph planning helpers.
- `repo-nav/package.json`: package metadata.
- `repo-nav/legacy-v1`: removed in `2.0.0`; use the root v2 contracts or the retained adapter subpaths above.
- Deep imports outside these export surfaces are unsupported.

## Machine examples

v1 success fixture (historical):

```json
{ "ok": true, "evidence": { "schemaVersion": "1.0", "status": "ok" } }
```

v2 tool error:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Locate request does not match the required schema.",
    "recoverable": true,
    "suggestedAction": "ADD_TERM"
  }
}
```

## `2.0.0` package cutover

The cutover removed only `repo-nav/legacy-v1` and updated all package, runtime, CLI, MCP, tarball, installed-package, SBOM, and release-confirmation version expectations to `2.0.0`. The root export, `repo-nav/backends`, `repo-nav/node`, `repo-nav/advanced`, `repo-nav/package.json`, and approved root compatibility exports are retained. Consumers that still require the removed contracts must remain on the 1.x package line while migrating to v2.

See [`project-status.md`](project-status.md) for the current implementation and release-evidence boundary.

## Install notes

Installed package `engines.node` is exactly `^22.0.0 || ^24.0.0`. Node 22 and 24 are supported; other majors are outside the declared engines range. Install with `npm i -g repo-nav@2.0.0`.
