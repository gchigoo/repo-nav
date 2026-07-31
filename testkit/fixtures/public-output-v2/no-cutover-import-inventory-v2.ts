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

/**
 * F1B public-output 仍禁止未接入 owner / feature slug 泄漏。
 * F2 已准入：LocateExecutionTokenV2、F1 materializer core 类型、source schema。
 */
export const FORBIDDEN_FUTURE_MODULE_MARKERS_V2 = Object.freeze([
  'public-output-boundary-v2',
  'relevance-ranking-budget',
  'request-outcome',
  'canonical-locate-facts-bridge',
] as const);

export const PUBLIC_OUTPUT_SOURCE_ROOT_V2 =
  'src/evidence/public-output' as const;
