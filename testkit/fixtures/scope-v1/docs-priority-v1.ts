export const DOCS_PRIORITY_V1 = Object.freeze([
  Object.freeze({
    path: 'doc/a.ts',
    layer: 'docs' as const,
    rule: 'docs-segment' as const,
  }),
  Object.freeze({
    path: 'Examples/a.ts',
    layer: 'docs' as const,
    rule: 'docs-segment' as const,
  }),
  Object.freeze({
    path: 'README.md',
    layer: 'docs' as const,
    rule: 'docs-extension' as const,
  }),
  Object.freeze({
    path: 'mydocs/a.ts',
    layer: 'unknown' as const,
    rule: 'unknown' as const,
  }),
] as const);
