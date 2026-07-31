# Migration: locate schema v1 to v2

## Summary

Production locate output is schema `2.0` only. There is no dual production schema, negotiation flag, or v1 fallback.

## Breaking changes

| Area                 | v1                                                 | v2                                                    |
| -------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| schemaVersion        | `1.0`                                              | `2.0`                                                 |
| success shape        | `evidence` object with status/coverage/nextActions | `ok:true` result with v2 evidence owners              |
| tool errors          | v1 public error policy / redactor path             | four fixed codes via trusted v2 factory               |
| IDs / ordinals       | v1 discovery keys                                  | v2 registration ordinals                              |
| file anchors         | Windows backslash accepted in some paths           | POSIX relative only; backslash rejected               |
| unsupported language | mixed into coverage                                | capability owner fragment                             |
| Node engines         | `>=20` historically                                | `^22.0.0 \|\| ^24.0.0`                                |
| package exports      | deep/private imports possible                      | root + `package.json` only                            |
| CLI Golden           | `repo-nav debug golden`                            | removed; use `npm run test:golden` in source checkout |

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

## Install notes

Installed package `engines.node` is exactly `^22.0.0 || ^24.0.0`. Node 20/23 are outside the declared engines range. Package `private:false` after owner publish authorization for the public beta.
