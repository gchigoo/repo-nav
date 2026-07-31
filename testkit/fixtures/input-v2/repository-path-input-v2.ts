/** F6-INPUT-001 repository path matrix. */
export const REPOSITORY_PATH_CASES_V2 = Object.freeze([
  Object.freeze({
    id: 'preserve-whitespace',
    repoPath: '  spaced-repo  ',
    expectPreserve: true,
  }),
  Object.freeze({
    id: 'reject-nul',
    repoPath: 'bad\0path',
    expectPreserve: false,
  }),
  Object.freeze({
    id: 'reject-oversize',
    repoPath: 'x'.repeat(4097),
    expectPreserve: false,
  }),
] as const);
