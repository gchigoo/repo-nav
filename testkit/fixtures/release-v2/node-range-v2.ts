/** F9-NODE-001 */
export const EXPECTED_NODE_ENGINES_V2 = '^22.0.0 || ^24.0.0' as const;
export const NODE_BOUNDARY_TABLE_V2 = Object.freeze([
  Object.freeze({ version: '21.0.0', allowed: false }),
  Object.freeze({ version: '22.0.0', allowed: true }),
  Object.freeze({ version: '23.0.0', allowed: false }),
  Object.freeze({ version: '24.0.0', allowed: true }),
  Object.freeze({ version: '25.0.0', allowed: false }),
] as const);
