/**
 * S1 move-only characterization：frozen pre-policy layer outcomes。
 */
export const EXISTING_LAYER_CHARACTERIZATION_V1 = Object.freeze([
  Object.freeze({ file: 'server/a.ts', layer: 'server' as const }),
  Object.freeze({ file: 'client/a.ts', layer: 'client' as const }),
  Object.freeze({ file: 'db/a.sql', layer: 'db' as const }),
  Object.freeze({ file: 'config/a.json', layer: 'config' as const }),
  Object.freeze({ file: 'test/a.ts', layer: 'test' as const }),
  Object.freeze({ file: 'src/a.spec.ts', layer: 'test' as const }),
  Object.freeze({ file: 'docs/a.md', layer: 'docs' as const }),
  Object.freeze({ file: 'README.md', layer: 'docs' as const }),
  Object.freeze({ file: 'packages/foo/a.ts', layer: 'unknown' as const }),
  Object.freeze({ file: 'e2e/a.ts', layer: 'unknown' as const }),
  Object.freeze({ file: 'doc/a.ts', layer: 'unknown' as const }),
] as const);
