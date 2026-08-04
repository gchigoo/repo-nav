# RepoNav Superpowers Workflow

RepoNav now uses a RoleKit-first workflow for new agentic work.

## Default flow

1. Write or select a durable spec in `docs/superpowers/specs/`.
2. Create a bounded plan in `docs/superpowers/plans/`.
3. Express the executable unit as a RoleKit task packet under `rolekit/tasks/` or start from `rolekit/tasks/examples/`.
4. Execute the task through Grok Build's host bridge workflow: `.grok/workflows/rolekit-host-bridge.rhai`.
5. Store verification and review evidence under `docs/superpowers/evidence/<topic>/`.

RoleKit owns role/task contracts. Grok Build owns host orchestration. Historical CodeStable and Superpowers records are archived under `docs/superpowers/archive/`.

## Primary references

- [RoleKit-first workflow](reference/rolekit-first-workflow.md)
- [Grok Build host bridge](reference/rolekit-host-bridge.md)
- [Review policy](reference/review-policy.md)
- [CodeStable migration map](reference/codestable-migration-map.md)

## Removed workflow roots

The old workflow roots were removed after explicit destructive-action approval:

- `.codestable/`
- `.superpowers/`

Historical records now live only in the archive indexes:

- [CodeStable archive](archive/codestable/INDEX.md)
- [Superpowers archive](archive/superpowers/INDEX.md)

Owner/runtime release evidence that used to live under `.codestable/runtime/` now belongs under `docs/superpowers/evidence/release-runtime/`, which remains untracked.
