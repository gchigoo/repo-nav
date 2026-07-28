export const TEST_PRIORITY_V1 = Object.freeze([
  Object.freeze({
    path: 'src/server/a.spec.ts',
    layer: 'test' as const,
    rule: 'test-basename' as const,
  }),
  Object.freeze({
    path: 'packages/api/__fixtures__/a.ts',
    layer: 'test' as const,
    rule: 'test-segment' as const,
  }),
  Object.freeze({
    path: 'e2e/a.ts',
    layer: 'test' as const,
    rule: 'test-segment' as const,
  }),
  Object.freeze({
    path: 'docs/tests/a.md',
    layer: 'test' as const,
    rule: 'test-segment' as const,
  }),
] as const);
