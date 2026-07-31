/**
 * F6-V1-001 fixture inventory and shadow-failure injection classes.
 * Cases must be exercised by behavioral assertions, not inventory alone.
 */

export const V1_COMPATIBILITY_CASES_V2 = Object.freeze([
  'shadow-fail-closed',
  'exact-legacy-reference',
  'caller-legacy-timeout',
  'deep-exact-non-boundary',
] as const);

export const V1_SHADOW_FAILURE_CLASSES_V2 = Object.freeze([
  'source',
  'corpus',
  'materialization',
  'contribution',
  'aggregation',
  'finalizer',
  'serializer',
] as const);

export type V1ShadowFailureClassV2 =
  (typeof V1_SHADOW_FAILURE_CLASSES_V2)[number];
