import type { CanonicalFileKeyV2 } from '../../repository/verified-file-snapshot-v2.js';
import type { RepositoryGitStateV2 } from './repository-git-state-probe-v2.js';

export type SnapshotRevalidationPolicyV2 =
  'retained-digest' | 'conditional-digest';

export type SnapshotBenchmarkPolicyV2 =
  'all-loaded-baseline' | SnapshotRevalidationPolicyV2;

export interface SnapshotRevalidationPlanInputV2 {
  readonly loadedCanonicalKeys: readonly CanonicalFileKeyV2[];
  readonly retainedEvidenceCanonicalKeys: readonly CanonicalFileKeyV2[];
  readonly eligibleCanonicalKeys: readonly CanonicalFileKeyV2[];
  readonly gitState: RepositoryGitStateV2;
}

export interface SnapshotRevalidationPlanV2 {
  readonly metadataCanonicalKeys: readonly CanonicalFileKeyV2[];
  readonly digestCanonicalKeys: readonly CanonicalFileKeyV2[];
  readonly eligibleDecisionSafe: boolean;
}

function sortedUniqueCanonicalKeysV2(
  inputs: readonly (readonly CanonicalFileKeyV2[])[],
): readonly CanonicalFileKeyV2[] {
  return Object.freeze(
    [...new Set(inputs.flat())].sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
}

function eligibleKeysAreRetainedV2(
  input: SnapshotRevalidationPlanInputV2,
): boolean {
  const retained = new Set(input.retainedEvidenceCanonicalKeys);
  return input.eligibleCanonicalKeys.every((key) => retained.has(key));
}

export function createSnapshotRevalidationPlanV2(
  policy: SnapshotRevalidationPolicyV2,
  input: SnapshotRevalidationPlanInputV2,
): SnapshotRevalidationPlanV2 {
  const retained = sortedUniqueCanonicalKeysV2([
    input.retainedEvidenceCanonicalKeys,
  ]);
  if (policy === 'retained-digest') {
    return Object.freeze({
      metadataCanonicalKeys: retained,
      digestCanonicalKeys: retained,
      eligibleDecisionSafe: eligibleKeysAreRetainedV2(input),
    });
  }

  const decisionRelevant = sortedUniqueCanonicalKeysV2([
    retained,
    input.eligibleCanonicalKeys,
  ]);
  const digestCanonicalKeys =
    input.gitState === 'clean' ? retained : decisionRelevant;
  return Object.freeze({
    metadataCanonicalKeys: decisionRelevant,
    digestCanonicalKeys,
    eligibleDecisionSafe: true,
  });
}

export function createSnapshotBenchmarkRevalidationPlanV2(
  policy: SnapshotBenchmarkPolicyV2,
  input: SnapshotRevalidationPlanInputV2,
): SnapshotRevalidationPlanV2 {
  if (policy !== 'all-loaded-baseline') {
    return createSnapshotRevalidationPlanV2(policy, input);
  }
  const loaded = sortedUniqueCanonicalKeysV2([input.loadedCanonicalKeys]);
  return Object.freeze({
    metadataCanonicalKeys: loaded,
    digestCanonicalKeys: loaded,
    eligibleDecisionSafe: true,
  });
}
