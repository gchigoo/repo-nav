/** F9-PACK-001 / F9-INSTALL-001 install smoke expectations */
export const INSTALL_REQUIRED_BINS_V2 = Object.freeze([
  Object.freeze({ name: 'repo-nav-mcp', path: 'dist/main.js' }),
  Object.freeze({ name: 'repo-nav', path: 'dist/cli/main.js' }),
] as const);

export const INSTALL_PACKAGE_MANAGER_V2 = 'npm@11.12.1' as const;
