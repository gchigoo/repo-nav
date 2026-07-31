/** F9-PACK-001 positive files allowlist */
export const PACKAGE_FILES_ALLOWLIST_V2 = Object.freeze([
  'dist/**/*.js',
  'dist/**/*.d.ts',
  'README.md',
  'SECURITY.md',
  'LICENSE',
  'docs/getting-started-mcp.md',
  'docs/debug-cli.md',
  'docs/reference/repo-nav-locate.md',
  'docs/migration-v1-to-v2.md',
] as const);

export const F9_PACK_ASSERTION_IDS_V2 = Object.freeze([
  'tarball-allowlist-exact',
  'package-bins-executable',
  'node-engine-range-declared',
  'mcp-v2-installed-parity',
  'package-runtime-closure',
] as const);
