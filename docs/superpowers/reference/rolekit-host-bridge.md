# Grok Build Host Bridge for RoleKit Tasks

**Status:** Current scaffold, reviewed 2026-08-15.

The project workflow `.grok/workflows/rolekit-host-bridge.rhai` executes exactly one RepoNav RoleKit task through a Grok Build subagent.

## Run shape

Example invocation from Grok Build:

```text
/workflow rolekit-host-bridge {"task_file":"rolekit/tasks/examples/review-change.yaml","role":"reviewer","capability_mode":"read-only","objective":"Review the current bounded workflow migration diff."}
```

Arguments:

| Argument          | Required | Meaning                                                 |
| ----------------- | -------- | ------------------------------------------------------- |
| `task_file`       | Yes      | Path to a concrete RoleKit task packet.                 |
| `role`            | No       | Role name; defaults to `reviewer`.                      |
| `capability_mode` | No       | Grok subagent capability mode; defaults to `read-only`. |
| `objective`       | No       | Human-readable execution objective.                     |

## Contract rules

1. The subagent must read `rolekit.yaml` and the task packet first.
2. The task packet's `allowedPaths`, `constraints`, and `acceptanceCriteria` define scope.
3. Read-only roles must not modify files.
4. Write roles must report changed files and checks.
5. The structured result contains `verdict`, `summary`, `changed_files`, `checks`, `evidence`, and `risks`.

## Current bridge limit

This workflow is a host bridge scaffold. It makes RoleKit the contract source for Grok execution, but it does not yet automate `rolekit compile` and `rolekit finalize` inside the workflow script. That stronger receipt loop should be added only after RepoNav can consume a stable RoleKit CLI or an approved local host tool without adding private package dependencies to public package metadata.
