# RepoNav Review Policy

**Status:** Current policy, reviewed 2026-08-15.

RepoNav review is risk-tiered. The default is no longer CodeStable's many-round gate sequence.

## Risk tiers

| Tier               | Examples                                                                                                     | Required review                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `low`              | Docs-only edits, small non-contract test comments, local workflow notes                                      | Targeted checks; no required subagent review.                                                                        |
| `normal`           | Ordinary implementation or refactor with bounded source/test changes                                         | One `reviewer` pass.                                                                                                 |
| `high`             | Process execution, filesystem boundaries, MCP public contract behavior, package metadata, CI/release tooling | One `reviewer` pass plus specialized review when applicable.                                                         |
| `release-critical` | Public export removal, version cutover, npm publish preparation, owner-only release actions                  | `reviewer`, `security-release-reviewer`, explicit owner gate, and no external side effect without separate approval. |

## Loop limit

Default maximum: one review plus one re-review.

A further review round requires at least one unresolved blocking finding involving:

- security or secret exposure;
- data loss or destructive behavior;
- public API or package contract breakage;
- release evidence integrity;
- production-impacting deployment behavior;
- process/filesystem containment failure.

## Reviewer requirements

A blocking finding must include:

- file path;
- line number when available;
- concrete issue;
- impact;
- suggested fix.

`PASS_WITH_NOTES` is terminal and must not request another review round. Notes are advisory follow-ups, not blockers.

## Scope of review

Reviewers inspect the actual diff, task packet, plan/spec, relevant files, and verification output. Reviewers must not use the historical archive as a default context source unless the task explicitly targets migration or historical evidence.
