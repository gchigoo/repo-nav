/**
 * Intentional v1 policy deltas vs pre-F7 top-level-only resolver。
 */
export const V1_POLICY_DELTA_V1 = Object.freeze([
  Object.freeze({
    path: 'e2e/a.ts',
    legacy: 'unknown' as const,
    current: 'test' as const,
  }),
  Object.freeze({
    path: 'doc/a.ts',
    legacy: 'unknown' as const,
    current: 'docs' as const,
  }),
  Object.freeze({
    path: 'packages/foo/server/client/a.ts',
    legacy: 'unknown' as const,
    current: 'server' as const,
  }),
  Object.freeze({
    path: 'apps/web/a.ts',
    legacy: 'unknown' as const,
    current: 'client' as const,
  }),
] as const);
