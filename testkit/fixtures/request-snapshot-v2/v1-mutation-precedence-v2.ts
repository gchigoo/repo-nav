/**
 * F3-V1-MUTATION-001：mutation 与 v1 status 组合契约。
 */
export const V1_MUTATION_PRECEDENCE_CONTRACT_V2 = Object.freeze({
  mutationWithOk: 'partial',
  mutationWithNoResult: 'partial',
  mutationWithPartial: 'partial',
  mutationWithBackendUnavailable: 'partial',
  mutationWithCallerAbort: 'timeout',
  mutationWithDeadline: 'timeout',
  forbidsSnapshotChangedCode: true,
  forbidsSnapshotChangedExclusion: true,
} as const);

export const V1_MUTATION_CHANGED_FILE_V2 = 'server/changed.ts' as const;
export const V1_MUTATION_STABLE_FILE_V2 = 'server/stable.ts' as const;
