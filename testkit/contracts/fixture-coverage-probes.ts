import { z } from 'zod';

import {
  AnchorKindSchema,
  BackendReasonCodeSchema,
  CandidateReasonCodeSchema,
  ConfirmedReasonCodeSchema,
  DiscoveryReasonCodeSchema,
  EvidenceOperationCodeSchema,
  EvidenceRoleSchema,
  EvidenceSourceSchema,
  ExclusionReasonCodeSchema,
  LimitReasonCodeSchema,
  NextActionCodeSchema,
  PromotionRequirementCodeSchema,
  RedactionReasonCodeSchema,
  RepoLayerSchema,
  SearchBackendIdSchema,
  TERM_CASE_MODES,
  TOOL_ERROR_CODES,
  TermCaseModeSchema,
} from '../../src/contracts/index.js';
import { LOCATE_STATUSES_V2 } from '../../src/contracts/v2/locate-result-v2.js';

export const CONTRACT_SCHEMA_PROBE_VALUES = Object.freeze({
  RepoLayer: Object.freeze([
    'client',
    'server',
    'db',
    'test',
    'docs',
    'config',
    'unknown',
  ]),
  AnchorKind: Object.freeze(['symbol', 'file', 'table', 'route', 'term']),
  TermCaseMode: Object.freeze(['sensitive', 'insensitive', 'smart']),
  LocateStatus: Object.freeze([
    'ok',
    'partial',
    'no_result',
    'backend_unavailable',
    'timeout',
    'cancelled',
  ]),
  EvidenceSource: Object.freeze(['codegraph', 'ripgrep', 'filesystem']),
  SearchBackendId: Object.freeze(['codegraph', 'ripgrep']),
  EvidenceRole: Object.freeze([
    'execution-site',
    'value-mapping',
    'definition',
    'reference',
    'related',
  ]),
  ConfirmedReasonCode: Object.freeze([
    'EXACT_TERM_MATCH',
    'EXACT_SYMBOL_ANCHOR',
    'DIRECT_ALIAS_MAPPING',
  ]),
  CandidateReasonCode: Object.freeze([
    'EXACT_TERM_WITHOUT_DIRECT_MAPPING',
    'SYMBOL_REFERENCE_ONLY',
    'SAME_SCOPE_SIMILAR_IDENTIFIER',
    'SAME_ENTITY_SIBLING',
    'ALIAS_SOURCE_NEIGHBOR',
    'SECONDARY_BACKEND_HIT',
  ]),
  DiscoveryReasonCode: Object.freeze([
    'LITERAL_TERM_HIT',
    'SYMBOL_SEARCH_HIT',
    'FILE_ANCHOR_HIT',
  ]),
  PromotionRequirementCode: Object.freeze([
    'USER_SEMANTIC_CONFIRMATION',
    'DIRECT_REFERENCE_REQUIRED',
    'CALL_PATH_REQUIRED',
  ]),
  EvidenceOperationCode: Object.freeze([
    'CODEGRAPH_QUERY',
    'RIPGREP_SEARCH',
    'FILESYSTEM_READ_RANGE',
    'FILESYSTEM_FIND_MATCHES',
  ]),
  BackendReasonCode: Object.freeze([
    'CODEGRAPH_INDEX_MISSING',
    'CODEGRAPH_UNAVAILABLE',
    'CODEGRAPH_NO_RESULT',
    'RIPGREP_UNAVAILABLE',
    'RIPGREP_NO_RESULT',
    'BACKEND_PROCESS_FAILED',
    'BACKEND_ABORTED',
  ]),
  LimitReasonCode: Object.freeze([
    'MAX_FILES_REACHED',
    'MAX_CONFIRMED_REACHED',
    'MAX_CANDIDATES_REACHED',
    'MAX_FILE_BYTES_REACHED',
    'MAX_EXCERPT_BYTES_REACHED',
    'TIMEOUT_REACHED',
  ]),
  ExclusionReasonCode: Object.freeze([
    'NEGATIVE_TERM_MATCH',
    'OUTSIDE_LAYER_HINT',
    'DUPLICATE_LOCATION',
    'UNVERIFIED_FILE_CONTENT',
  ]),
  RedactionReasonCode: Object.freeze([
    'SECRET_LIKE_VALUE',
    'CONNECTION_STRING',
    'PERSONAL_DATA',
    'BINARY_OR_OVERSIZED_CONTENT',
  ]),
  NextActionCode: Object.freeze([
    'ADD_TERM',
    'ADD_SYMBOL_ANCHOR',
    'CONFIRM_CANDIDATE',
    'INITIALIZE_CODEGRAPH',
    'RETRY_WITH_HIGHER_LIMIT',
  ]),
  ToolErrorCode: Object.freeze([
    'INVALID_INPUT',
    'INVALID_REPOSITORY',
    'PATH_OUTSIDE_ROOT',
    'INTERNAL_ERROR',
  ]),
} satisfies Readonly<Record<string, readonly string[]>>);

const PROBE_SCHEMAS: Readonly<Record<string, z.ZodType>> = Object.freeze({
  RepoLayer: RepoLayerSchema,
  AnchorKind: AnchorKindSchema,
  TermCaseMode: TermCaseModeSchema,
  LocateStatus: z.enum(LOCATE_STATUSES_V2),
  EvidenceSource: EvidenceSourceSchema,
  SearchBackendId: SearchBackendIdSchema,
  EvidenceRole: EvidenceRoleSchema,
  ConfirmedReasonCode: ConfirmedReasonCodeSchema,
  CandidateReasonCode: CandidateReasonCodeSchema,
  DiscoveryReasonCode: DiscoveryReasonCodeSchema,
  PromotionRequirementCode: PromotionRequirementCodeSchema,
  EvidenceOperationCode: EvidenceOperationCodeSchema,
  BackendReasonCode: BackendReasonCodeSchema,
  LimitReasonCode: LimitReasonCodeSchema,
  ExclusionReasonCode: ExclusionReasonCodeSchema,
  RedactionReasonCode: RedactionReasonCodeSchema,
  NextActionCode: NextActionCodeSchema,
  ToolErrorCode: z.enum(TOOL_ERROR_CODES),
});

export interface ReasonCodeNegativeProbe {
  readonly family: 'ConfirmedReasonCode' | 'CandidateReasonCode';
  readonly code: string;
}

export const REASON_CODE_NEGATIVE_PROBES = Object.freeze([
  ...CONTRACT_SCHEMA_PROBE_VALUES.ConfirmedReasonCode.map((code) => ({
    family: 'ConfirmedReasonCode' as const,
    code,
  })),
  ...CONTRACT_SCHEMA_PROBE_VALUES.CandidateReasonCode.map((code) => ({
    family: 'CandidateReasonCode' as const,
    code,
  })),
] satisfies readonly ReasonCodeNegativeProbe[]);

export function runContractSchemaProbes(): readonly string[] {
  if (
    JSON.stringify(CONTRACT_SCHEMA_PROBE_VALUES.TermCaseMode) !==
    JSON.stringify(TERM_CASE_MODES)
  ) {
    throw new Error(
      'Explicit TermCaseMode probes differ from the contract constants.',
    );
  }
  const verified: string[] = [];
  for (const [family, values] of Object.entries(CONTRACT_SCHEMA_PROBE_VALUES)) {
    const schema = PROBE_SCHEMAS[family];
    if (schema === undefined) {
      throw new Error(`Missing executable schema probe for ${family}.`);
    }
    for (const value of values) {
      if (schema.parse(value) !== value) {
        throw new Error(`Schema probe normalized ${family}.${value}.`);
      }
      verified.push(`${family}.${value}`);
    }
  }
  return Object.freeze(verified);
}
