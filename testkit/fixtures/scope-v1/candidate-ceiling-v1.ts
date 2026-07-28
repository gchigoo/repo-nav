export const CANDIDATE_CEILING_V1 = Object.freeze({
  explicitTestFile: 'test/mapping.ts',
  explicitDocsFile: 'docs/mapping.md',
  mappingExcerpt: 'targetField = row.source_field;',
  terms: Object.freeze([
    Object.freeze({ value: 'targetField', caseSensitive: false }),
    Object.freeze({ value: 'row.source_field', caseSensitive: false }),
  ]),
} as const);
