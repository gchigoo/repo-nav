export interface PublicPackageExportDispositionV2 {
  readonly specifier:
    | '.'
    | './advanced'
    | './backends'
    | './legacy-v1'
    | './node'
    | './package.json';
  readonly action: 'retain-c5' | 'remove-c5';
}

export interface PublicPackageSubpathExportsV2 {
  readonly specifier: './advanced' | './backends' | './node';
  readonly sourceFile: string;
  readonly runtime: readonly string[];
  readonly types: readonly string[];
}

/** Exact package export disposition at the 1.1.0 hardening checkpoint. */
export const PUBLIC_PACKAGE_EXPORT_DISPOSITIONS_V2: readonly PublicPackageExportDispositionV2[] =
  Object.freeze([
    Object.freeze({ specifier: '.', action: 'retain-c5' }),
    Object.freeze({ specifier: './advanced', action: 'retain-c5' }),
    Object.freeze({ specifier: './backends', action: 'retain-c5' }),
    Object.freeze({ specifier: './legacy-v1', action: 'remove-c5' }),
    Object.freeze({ specifier: './node', action: 'retain-c5' }),
    Object.freeze({ specifier: './package.json', action: 'retain-c5' }),
  ]);

export const PUBLIC_PACKAGE_EXPORT_KEYS_V2 = Object.freeze(
  PUBLIC_PACKAGE_EXPORT_DISPOSITIONS_V2.map((entry) => entry.specifier),
);

/** Exact runtime/type inventories for the public 1.1.0 adapter subpaths. */
export const PUBLIC_PACKAGE_SUBPATH_EXPORTS_V2: readonly PublicPackageSubpathExportsV2[] =
  Object.freeze([
    Object.freeze({
      specifier: './advanced',
      sourceFile: 'src/advanced.ts',
      runtime: Object.freeze([
        'MCP_STDIO_HOST',
        'REPOSITORY_EVIDENCE_SERVICE',
        'REPOSITORY_READER',
        'REPOSITORY_SEARCH_BACKENDS',
        'createCodeGraphProcessInvocation',
        'createCodeGraphQueryPlan',
        'parseCodeGraphQuery',
        'parseCodeGraphStatus',
      ]),
      types: Object.freeze([
        'CodeGraphProcessInvocation',
        'CodeGraphQueryPlan',
        'CodeGraphQueryPlanEntry',
        'ParsedCodeGraphQuery',
      ]),
    }),
    Object.freeze({
      specifier: './backends',
      sourceFile: 'src/backends.ts',
      runtime: Object.freeze(['CodeGraphBackend', 'RipgrepBackend']),
      types: Object.freeze(['CodeGraphBackend', 'RipgrepBackend']),
    }),
    Object.freeze({
      specifier: './node',
      sourceFile: 'src/node.ts',
      runtime: Object.freeze(['NodeRepositoryReader', 'NodeSafeProcessRunner']),
      types: Object.freeze(['NodeRepositoryReader', 'NodeSafeProcessRunner']),
    }),
  ]);
