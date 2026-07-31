/** F6-TRANSPORT-001 CLI argv cases. */
export const CLI_ARGV_CASES_V2 = Object.freeze([
  Object.freeze({
    id: 'missing-question',
    args: ['debug', 'locate', '--repo', '.', '--term', 'Foo'],
    expectOk: true,
  }),
  Object.freeze({
    id: 'file-backslash',
    args: [
      'debug',
      'locate',
      '--repo',
      '.',
      '--term',
      'Foo',
      '--anchor',
      'file:src\\a.ts',
    ],
    expectOk: false,
  }),
] as const);