/**
 * F3-V1-MUTATION-001：mutation 与 public status 组合契约（F9 后为 v2）。
 */
export const V1_MUTATION_PRECEDENCE_CONTRACT_V2 = Object.freeze({
  mutationWithOk: 'partial',
  mutationWithNoResult: 'partial',
  mutationWithPartial: 'partial',
  mutationWithBackendUnavailable: 'partial',
  mutationWithCallerAbort: 'timeout',
  mutationWithDeadline: 'timeout',
  // v2 schema requires SNAPSHOT_CHANGED agreement when consistency=changed
  forbidsSnapshotChangedCode: false,
  forbidsSnapshotChangedExclusion: false,
} as const);

export const V1_MUTATION_CHANGED_FILE_V2 = 'server/changed.ts' as const;
export const V1_MUTATION_STABLE_FILE_V2 = 'server/stable.ts' as const;
