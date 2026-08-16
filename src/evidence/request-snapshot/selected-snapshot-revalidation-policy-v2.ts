import type { SnapshotRevalidationPolicyV2 } from './snapshot-revalidation-policy-v2.js';

export const SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2 =
  'conditional-digest' satisfies SnapshotRevalidationPolicyV2;

export const SNAPSHOT_REVALIDATION_SELECTION_EVIDENCE_V2 = Object.freeze({
  schemaVersion: 1,
  headSha: '3da72f8c38c11eeab9b5480d5d6435efa72a3f53',
  runId: 31809134722,
  runAttempt: 1,
  artifactId: 9222384999,
  catalogSha256:
    'b4655bd6cc700ea65e8114f249f68d39478f969235f2d8d88d3a474e8045aa48',
  reportSha256:
    'ba5806b2262f1ff0cd50ad13e2dab941cf1d9e22f6a12baeb7b26b38d0fd90ab',
} as const);
