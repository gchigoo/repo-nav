export const ORDINARY_SEGMENT_PRIORITY_V1 = Object.freeze([
  Object.freeze({
    path: 'packages/foo/server/client/a.ts',
    layer: 'server' as const,
  }),
  Object.freeze({
    path: 'packages/foo/client/server/a.ts',
    layer: 'client' as const,
  }),
  Object.freeze({
    path: 'vendor/lib/a.ts',
    layer: 'unknown' as const,
  }),
] as const);
