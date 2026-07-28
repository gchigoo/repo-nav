export const CANONICAL_EXECUTION_SCOPE_V1 = Object.freeze({
  requiredOwnersAfterF7: Object.freeze([
    'snapshot',
    'ranking',
    'backend',
    'request-outcome',
    'scope',
  ] as const),
  stillMissing: 'capability' as const,
  contributionOwnerOrder: Object.freeze([
    'public-materialization',
    'snapshot-observation',
    'scope',
  ] as const),
} as const);
