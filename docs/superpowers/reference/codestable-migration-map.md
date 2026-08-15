# CodeStable Migration Map

**Status:** Migration and destructive cleanup completed; reviewed 2026-08-15.

This repository keeps CodeStable history but does not use CodeStable as the default future workflow engine. Archive payloads remain unchanged as historical evidence.

## Source to target mapping

| Old source                  | New durable location                                | Status                                                                                                                 |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.codestable/architecture/` | `docs/superpowers/archive/codestable/architecture/` | Historical architecture archive. Active architecture updates should use `docs/superpowers/reference/` or product docs. |
| `.codestable/reference/`    | `docs/superpowers/archive/codestable/reference/`    | Historical process reference. New process reference lives in `docs/superpowers/reference/`.                            |
| `.codestable/features/`     | `docs/superpowers/archive/codestable/features/`     | Historical feature evidence. New task evidence goes under `docs/superpowers/evidence/<topic>/`.                        |
| `.codestable/roadmap/`      | `docs/superpowers/archive/codestable/roadmap/`      | Historical roadmap archive. Future planning uses specs/plans plus RoleKit tasks.                                       |
| `.codestable/tools/`        | `docs/superpowers/archive/codestable/tools/`        | Historical tooling archive. Do not use as default gate runner.                                                         |
| `.codestable/gates/`        | `docs/superpowers/archive/codestable/gates/`        | Historical gate policy archive. New review policy is risk-tiered.                                                      |
| `.superpowers/sdd/`         | `docs/superpowers/archive/superpowers/sdd/`         | Historical SDD execution evidence. New evidence goes under `docs/superpowers/evidence/<topic>/`.                       |

## Active workflow replacement

- CodeStable task agent conventions are replaced by RoleKit role specs in `rolekit/roles/`.
- CodeStable feature checklists are replaced by RoleKit task packets and targeted checks.
- CodeStable review packets are replaced by `reviewer` and `security-release-reviewer` output contracts.
- CodeStable many-round gate loops are replaced by the review policy in `docs/superpowers/reference/review-policy.md`.

## Deletion policy

Destructive cleanup has been completed after explicit user approval.

The removed workflow roots are:

- `.codestable/`
- `.superpowers/`

The historical source of record is now:

- `docs/superpowers/archive/codestable/INDEX.md`
- `docs/superpowers/archive/codestable/MANIFEST.tsv`
- `docs/superpowers/archive/superpowers/INDEX.md`
- `docs/superpowers/archive/superpowers/MANIFEST.tsv`

Owner/runtime release evidence that used to live under `.codestable/runtime/` now belongs under `docs/superpowers/evidence/release-runtime/`. That directory is ignored by git because owner evidence is local runtime state, not versioned documentation.

## Destructive cleanup status

Before deletion, archive manifests were checked against the old source roots with content hashes. After deletion, the old workflow roots no longer exist in the working tree; the archive copies remain available for historical lookup.
