export const CANONICAL_EXECUTION_SCOPE_V1 = Object.freeze({
  requiredOwnersAfterF7: Object.freeze([
    'snapshot',
    'ranking',
    'backend',
    'request-outcome',
    'scope',
  ] as const),
  /** F8 前仍缺；F8 revision 后 capability 进入 contribution tuple。 */
  stillMissing: 'capability' as const,
  contributionOwnerOrder: Object.freeze([
    'public-materialization',
    'snapshot-observation',
    'scope',
    'capability',
  ] as const),
} as const);
