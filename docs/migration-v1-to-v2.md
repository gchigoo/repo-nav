# Migration: locate schema v1 to v2

## Summary

Production locate output is schema `2.0` only. There is no dual production schema, negotiation flag, or v1 fallback.

The current package line is `1.1.0`. It keeps `repo-nav/legacy-v1` as an explicit compatibility subpath while the root and production surfaces remain v2. The planned `2.0.0` cutover has not happened yet.

## Breaking changes

| Area                 | v1                                                 | v2                                                     |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| schemaVersion        | `1.0`                                              | `2.0`                                                  |
| success shape        | `evidence` object with status/coverage/nextActions | `ok:true` result with v2 evidence owners               |
| tool errors          | v1 public error policy / redactor path             | four fixed codes via trusted v2 factory                |
| IDs / ordinals       | v1 discovery keys                                  | v2 registration ordinals                               |
| file anchors         | Windows backslash accepted in some paths           | POSIX relative only; backslash rejected                |
| unsupported language | mixed into coverage                                | capability owner fragment                              |
| Node engines         | pre-v2 range (outside current support)             | `^22.0.0 \|\| ^24.0.0`                                 |
| package exports      | deep/private imports possible                      | root v2-only + explicit compatibility/adapter subpaths |
| CLI Golden           | `repo-nav debug golden`                            | removed; use `npm run test:golden` in source checkout  |

## Package exports

- `repo-nav` (root): v2 locate contracts, request parsers, and application helpers. It also retains deprecated adapter re-exports for 1.x compatibility.
- `repo-nav/backends`: `RipgrepBackend` and `CodeGraphBackend`.
- `repo-nav/node`: `NodeRepositoryReader` and `NodeSafeProcessRunner`.
- `repo-nav/advanced`: advanced dependency-injection tokens and CodeGraph planning helpers.
- `repo-nav/legacy-v1`: historical v1 contracts and helpers for migration or compatibility tests.
- `repo-nav/package.json`: package metadata.
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

## Planned `2.0.0` package cutover

The remaining hardening plan removes only `repo-nav/legacy-v1` in the same atomic change that updates all version authorities to `2.0.0`. The root export, `repo-nav/backends`, `repo-nav/node`, `repo-nav/advanced`, and `repo-nav/package.json` are retained. Until that cutover lands, consumers that still need v1 contracts can use the explicit legacy subpath on the 1.x line.

See [`project-status.md`](project-status.md) for the current implementation boundary.

## Install notes

Installed package `engines.node` is exactly `^22.0.0 || ^24.0.0`. Node 22 and 24 are supported; other majors are outside the declared engines range. Install with `npm i -g repo-nav@1.1.0`.
