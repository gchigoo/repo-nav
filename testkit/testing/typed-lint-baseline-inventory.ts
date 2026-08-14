export const TYPED_LINT_BASELINE_INVENTORY_V1 = Object.freeze({
  schemaVersion: 1,
  owner: 'eslint.config.mjs',
  gate: 'npm run lint',
  scopes: Object.freeze(['test/**/*.ts', 'testkit/**/*.ts'] as const),
  rules: Object.freeze([
    '@typescript-eslint/no-floating-promises',
    '@typescript-eslint/no-misused-promises',
  ] as const),
  acceptedViolations: 0,
} as const);
