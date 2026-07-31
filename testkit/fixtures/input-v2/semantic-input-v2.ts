/** F6-SEMANTIC-001 semantic normalization cases. */
export const SEMANTIC_INPUT_CASES_V2 = Object.freeze([
  Object.freeze({
    id: 'question-optional',
    request: { terms: ['Foo'] },
    questionPresent: false,
  }),
  Object.freeze({
    id: 'question-whitespace-invalid',
    request: { terms: ['Foo'], question: '   ' },
    expectInvalid: true,
  }),
  Object.freeze({
    id: 'term-nfkc',
    request: { terms: ['ｈｃｐ＿ｉｄ'] },
    expectedTerm: 'hcp_id',
  }),
] as const);
