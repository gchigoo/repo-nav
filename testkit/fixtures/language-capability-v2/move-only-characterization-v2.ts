/**
 * F8-MOVE-001：S1 move-only characterization marker fixture。
 */

export const MOVE_ONLY_CHARACTERIZATION_V2 = Object.freeze({
  legacyExports: Object.freeze([
    'maskNonCode',
    'maskSqlNonCode',
    'classifyDiscoveryRecords',
  ]),
  kernelOwners: Object.freeze([
    'src/evidence/language/ecmascript-lexical-kernel-v2.ts',
    'src/evidence/language/sql-lexical-kernel-v2.ts',
    'src/evidence/language/identifier-structure-kernel-v2.ts',
  ]),
});
