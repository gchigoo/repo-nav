# Snapshot revalidation clean-branch evidence v1

## Result

The selected `conditional-digest` policy retained one eligible-only file after the production final snapshot check used the real filesystem metadata verifier with repository Git state `clean`. The final check performed 1 metadata check, 0 digest checks, retained 1 eligible record, and reported `stable` consistency.

## Authority and scope

- Authority: `source-bound-real-final-check+filesystem-metadata`
- Source SHA-256: `0614f75927b831907af0ea4e870c1c098ed9acad9c9db770dc8cae2ff2188762`
- Branch: `eligible-only-metadata`
- Files checked: 1
- Changed canonical keys: 0
- Trusted eligible records: 1

The source digest binds this deterministic probe to the production final-check implementation, policy planner, selected policy constant, and probe source listed in `testkit/baselines/performance/snapshot-revalidation-clean-branch-v1.json`. This is supplemental source-bound correctness evidence. It does not alter or replace the imported authoritative GitHub timing artifact recorded in `snapshot-revalidation-selection-v1.md`.

## Reproduction

Run `npm run benchmark:snapshot-revalidation:clean-branch`. The command must regenerate this document and the committed JSON evidence byte-for-byte.
