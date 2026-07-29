/** F9-MIGRATION-001 */
export const MIGRATION_REQUIRED_PHRASES_V2 = Object.freeze([
  'schema `2.0` only',
  '^22.0.0 || ^24.0.0',
  'private:true',
  'debug golden',
] as const);

export const MIGRATION_FORBIDDEN_PHRASES_V2 = Object.freeze([
  'Node 20+',
  "schemaVersion === '1.0'",
] as const);
