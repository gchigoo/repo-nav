# Snapshot revalidation policy selection v1

## Decision

Production uses `conditional-digest`. Runtime policy is fixed by the generated TypeScript constant and is not selected from host-local timing.

## Authoritative source

- Repository: `gchigoo/repo-nav`
- Workflow/job: `package-release-ci` / `snapshot-revalidation-benchmark`
- Head SHA: `3da72f8c38c11eeab9b5480d5d6435efa72a3f53`
- Run: `31809134722`, attempt `1`
- Artifact: `snapshot-revalidation-candidate-v1` (ID `9222384999`)
- Artifact digest: `sha256:4bd68e3f73796e8a68c26850b5d4ffd2786f3c51167dbd3232a577de48ed09d9`
- Catalog SHA-256: `b4655bd6cc700ea65e8114f249f68d39478f969235f2d8d88d3a474e8045aa48`
- Report SHA-256: `ba5806b2262f1ff0cd50ad13e2dab941cf1d9e22f6a12baeb7b26b38d0fd90ab`
- Artifact retention window recorded by GitHub: `2026-08-14T14:22:12Z` to `2026-08-21T14:22:11Z`

## Measurements

| Policy                | p50 µs | p95 µs | Metadata checks | Digest checks | Digest bytes | Decision-safe |
| --------------------- | -----: | -----: | --------------: | ------------: | -----------: | ------------- |
| `all-loaded-baseline` |  12004 |  12073 |              17 |            17 |          992 | yes           |
| `retained-digest`     |   4227 |   4802 |               6 |             6 |          367 | no            |
| `conditional-digest`  |   7447 |   8561 |              12 |            12 |          738 | yes           |

The selector rejects `retained-digest` because it is not safe for decision-relevant eligible files. `conditional-digest` is correctness-safe and improves p95 by 2908 basis points against the all-loaded baseline, exceeding the committed 1500-basis-point threshold. Exact optimized-policy timing ties prefer `conditional-digest`.

## Supplemental clean-branch correctness

The source-bound evidence in `snapshot-revalidation-clean-branch-v1.md` exercises the selected policy through the production final snapshot check. It confirms that a clean eligible-only file uses the real filesystem metadata verifier, performs no final-check digest read, remains in the trusted eligible pool, and reports stable consistency. This supplemental check does not modify the imported authoritative timing report or its hash.

## Reproduction

The committed baseline at `testkit/baselines/performance/snapshot-revalidation-v1.json` contains the strict parsed report, source binding, and deterministic decision. The importer regenerates this document and `selected-snapshot-revalidation-policy-v2.ts` byte-for-byte.
