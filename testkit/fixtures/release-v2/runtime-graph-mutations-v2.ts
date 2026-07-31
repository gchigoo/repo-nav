/**
 * F9-NO-V1-001 forbidden production reachability tokens.
 */
export const NO_V1_FORBIDDEN_SYMBOLS_V2 = Object.freeze([
  'redactLocateResult',
  'applyPublicErrorPolicy',
  'V1LocateResultProjector',
  'legacyV1Projection',
] as const);

export const NO_V1_SCAN_PATHS_V2 = Object.freeze([
  'src/mcp',
  'src/cli',
  'src/index.ts',
  'src/evidence/evidence.module.ts',
  'src/evidence/locate-execution',
] as const);

export const NO_V1_ALLOW_REDACT_LOCATE_FILE_V2 =
  'src/evidence/evidence-redactor.ts' as const;
