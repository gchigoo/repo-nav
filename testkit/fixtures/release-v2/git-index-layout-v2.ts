/** F9-REAL-MCP-001 git index authority helpers. */
export const GIT_INDEX_PATH_FORMAT_ARGS_V2 = Object.freeze([
  'rev-parse',
  '--path-format=absolute',
  '--git-path',
  'index',
] as const);
