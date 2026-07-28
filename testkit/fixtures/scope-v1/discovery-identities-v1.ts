export const DISCOVERY_IDENTITIES_V1 = Object.freeze({
  samePathBackends: Object.freeze(['codegraph', 'ripgrep'] as const),
  samePathFile: 'src/server/shared.ts',
  excludedFile: 'docs/out.md',
} as const);
