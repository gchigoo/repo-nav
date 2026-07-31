import { describe, expect, it } from 'vitest';

import * as root from '../../src/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

/** F9 root runtime export surface — update intentionally when public API changes. */
const EXPECTED_ROOT_EXPORT_KEYS = Object.freeze([
  'ANCHOR_KINDS_V2',
  'BACKEND_REASON_CODES_V2',
  'CANDIDATE_REASON_CODES_V2',
  'CONFIRMED_REASON_CODES_V2',
  'COVERAGE_DEGRADATION_CODES_V2',
  'CodeGraphBackend',
  'CoverageReportV2Schema',
  'EVIDENCE_OPERATION_CODES_V2',
  'EVIDENCE_ROLES_V2',
  'EVIDENCE_SOURCES_V2',
  'EXCLUSION_REASON_CODES_V2',
  'FinalizedUnsafeCoverageReportV2Schema',
  'FinalizedUnsafeLocateResultV2Schema',
  'LIMIT_REASON_CODES_V2',
  'LOCATE_STATUSES_V2',
  'LocateResultV2Schema',
  'MCP_STDIO_HOST',
  'NEXT_ACTION_CODES_V2',
  'NodeRepositoryReader',
  'NodeSafeProcessRunner',
  'PROMOTION_REQUIREMENT_CODES_V2',
  'REDACTED_FIELDS_V2',
  'REDACTION_REASON_CODES_V2',
  'REPOSITORY_EVIDENCE_SERVICE',
  'REPOSITORY_READER',
  'REPOSITORY_SEARCH_BACKENDS',
  'REPO_LAYERS_V2',
  'RipgrepBackend',
  'SEARCH_BACKEND_IDS_V2',
  'TOOL_ERROR_CODES_V2',
  'UPSTREAM_DEGRADATION_CODES_V2',
  'canonicalizeCoverageV2',
  'createCodeGraphProcessInvocation',
  'createCodeGraphQueryPlan',
  'createRepoNavApplicationContext',
  'deriveLocateStatusV2',
  'guardLocateRequestRawV2',
  'parseCodeGraphQuery',
  'parseCodeGraphStatus',
  'parseLocateRequestV2',
  'readPackageMetadata',
  'safeParseLocateRequestV2',
] as const);

describe.runIf(
  isSelected({ group: 'public-beta-release', caseId: 'package-metadata' }),
)('F9-METADATA-002 root-export-snapshot', () => {
  it('exports a frozen v2-only root runtime surface', () => {
    expect(Object.keys(root).sort()).toEqual([...EXPECTED_ROOT_EXPORT_KEYS]);
  });
});
