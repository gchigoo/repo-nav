/** F1B-NOCUTOVER-001: production roots and forbidden future-module markers. */
export const NO_CUTOVER_PRODUCTION_ROOTS_V2 = Object.freeze([
  'src/index.ts',
  'src/contracts/index.ts',
  'src/evidence/repository-evidence-engine.ts',
  'src/mcp/locate-tool-output.ts',
  'src/mcp/repo-nav-mcp-server.ts',
  'tools/cli/main.ts',
  'tools/cli/execute.ts',
] as const);

/** F1C/F2/F6 markers remain forbidden; F1B budget modules are in scope. */
export const FORBIDDEN_FUTURE_MODULE_MARKERS_V2 = Object.freeze([
  'public-output-boundary-v2',
  'relevance-ranking-budget',
  'request-outcome',
  'LocateExecutionTokenV2',
  'TrustedMaterializedEvidenceCoreV2',
  'canonical-locate-facts-bridge',
  'UnsafePublicMaterializationSourceV2Schema',
] as const);

export const PUBLIC_OUTPUT_SOURCE_ROOT_V2 =
  'src/evidence/public-output' as const;
