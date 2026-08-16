/** F9-MIGRATION-001 */
export const MIGRATION_REQUIRED_PHRASES_V2 = Object.freeze([
  'schema `2.0` only',
  '^22.0.0 || ^24.0.0',
  'repo-nav/legacy-v1',
  'removed in `2.0.0`',
  'root v2-only',
  'debug golden',
] as const);

export const MIGRATION_FORBIDDEN_PHRASES_V2 = Object.freeze([
  'Node 20+',
  "schemaVersion === '1.0'",
] as const);
