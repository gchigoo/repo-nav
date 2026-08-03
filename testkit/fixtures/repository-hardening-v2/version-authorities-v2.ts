export interface VersionAuthorityV2 {
  readonly id:
    | 'package-json-root'
    | 'shrinkwrap-root'
    | 'shrinkwrap-workspace-root'
    | 'runtime-package-metadata'
    | 'cli-version'
    | 'mcp-server-info'
    | 'tarball-filename'
    | 'installed-package-json'
    | 'sbom-root'
    | 'real-consumer-confirmation';
  readonly module: string;
  readonly binding: string;
  readonly wiring: 'wired' | 'planned-unwired';
  readonly expected: string;
}

/** Literal characterization values; never derive these from package metadata. */
export const VERSION_AUTHORITIES_V2: readonly VersionAuthorityV2[] =
  Object.freeze([
    Object.freeze({
      id: 'package-json-root',
      module: 'package.json',
      binding: 'version',
      wiring: 'wired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'shrinkwrap-root',
      module: 'npm-shrinkwrap.json',
      binding: 'version',
      wiring: 'wired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'shrinkwrap-workspace-root',
      module: 'npm-shrinkwrap.json',
      binding: 'packages[""].version',
      wiring: 'wired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'runtime-package-metadata',
      module: 'src/runtime/package-metadata.ts',
      binding: 'readPackageMetadata().version',
      wiring: 'wired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'cli-version',
      module: 'src/cli/execute.ts',
      binding: 'executeCli(["--version"]).stdout',
      wiring: 'wired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'mcp-server-info',
      module: 'src/mcp/repo-nav-mcp-server.ts',
      binding: 'serverInfo.version',
      wiring: 'wired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'tarball-filename',
      module: 'tools/release/pack-candidate.mjs',
      binding: 'npm pack filename',
      wiring: 'wired',
      expected: 'repo-nav-1.0.6.tgz',
    }),
    Object.freeze({
      id: 'installed-package-json',
      module: 'tools/release/pack-candidate.mjs',
      binding: 'installed node_modules/repo-nav/package.json.version',
      wiring: 'planned-unwired',
      expected: '1.0.6',
    }),
    Object.freeze({
      id: 'sbom-root',
      module: 'tools/release/sbom-from-shrinkwrap.mjs',
      binding: 'bom.metadata.component.purl',
      wiring: 'wired',
      expected: 'pkg:npm/repo-nav@1.0.6',
    }),
    Object.freeze({
      id: 'real-consumer-confirmation',
      module: 'tools/release/real-consumer-contracts.mjs',
      binding: 'confirmation.candidate.version',
      wiring: 'planned-unwired',
      expected: '1.0.6',
    }),
  ]);
