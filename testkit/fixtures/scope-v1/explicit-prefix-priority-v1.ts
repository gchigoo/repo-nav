export const EXPLICIT_PREFIX_PRIORITY_V1 = Object.freeze([
  Object.freeze({ path: 'apps/web/a.ts', layer: 'client' as const }),
  Object.freeze({ path: 'packages/frontend/a.ts', layer: 'client' as const }),
  Object.freeze({ path: 'src/client/a.ts', layer: 'client' as const }),
  Object.freeze({ path: 'apps/api/a.ts', layer: 'server' as const }),
  Object.freeze({ path: 'packages/backend/a.ts', layer: 'server' as const }),
  Object.freeze({ path: 'src/server/a.ts', layer: 'server' as const }),
  Object.freeze({ path: 'db/a.sql', layer: 'db' as const }),
  Object.freeze({ path: 'database/a.sql', layer: 'db' as const }),
  Object.freeze({ path: 'migrations/001.sql', layer: 'db' as const }),
  Object.freeze({ path: '.config/a.json', layer: 'config' as const }),
  Object.freeze({ path: 'config/a.json', layer: 'config' as const }),
  Object.freeze({ path: 'configs/a.json', layer: 'config' as const }),
] as const);
