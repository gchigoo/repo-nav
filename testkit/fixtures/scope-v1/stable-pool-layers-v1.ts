export const STABLE_POOL_LAYERS_V1 = Object.freeze({
  effective: Object.freeze([
    'client',
    'server',
    'db',
    'config',
    'unknown',
  ] as const),
  matchedServer: 'server' as const,
  unmatchedWithoutServer: Object.freeze([
    'client',
    'db',
    'config',
    'unknown',
  ] as const),
} as const);
