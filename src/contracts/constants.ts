export const EVIDENCE_SCHEMA_VERSION = '1.0' as const;

export const REPO_LAYERS = [
  'client',
  'server',
  'db',
  'test',
  'docs',
  'config',
  'unknown',
] as const;

export const ANCHOR_KINDS = [
  'symbol',
  'file',
  'table',
  'route',
  'term',
] as const;

export const TERM_CASE_MODES = ['sensitive', 'insensitive', 'smart'] as const;

export const LOCATE_STATUSES = [
  'ok',
  'partial',
  'no_result',
  'backend_unavailable',
  'timeout',
] as const;

export const EVIDENCE_SOURCES = ['codegraph', 'ripgrep', 'filesystem'] as const;

export const SEARCH_BACKEND_IDS = ['codegraph', 'ripgrep'] as const;

export const EVIDENCE_ROLES = [
  'execution-site',
  'value-mapping',
  'definition',
  'reference',
  'related',
] as const;

export const REDACTION_REASON_CODES = [
  'SECRET_LIKE_VALUE',
  'CONNECTION_STRING',
  'PERSONAL_DATA',
  'BINARY_OR_OVERSIZED_CONTENT',
] as const;

export const CONFIRMED_REASON_CODES = [
  'EXACT_TERM_MATCH',
  'EXACT_SYMBOL_ANCHOR',
  'DIRECT_ALIAS_MAPPING',
] as const;

export const CANDIDATE_REASON_CODES = [
  'EXACT_TERM_WITHOUT_DIRECT_MAPPING',
  'SYMBOL_REFERENCE_ONLY',
  'SAME_SCOPE_SIMILAR_IDENTIFIER',
  'SAME_ENTITY_SIBLING',
  'ALIAS_SOURCE_NEIGHBOR',
  'SECONDARY_BACKEND_HIT',
] as const;

export const DISCOVERY_REASON_CODES = [
  'LITERAL_TERM_HIT',
  'SYMBOL_SEARCH_HIT',
  'FILE_ANCHOR_HIT',
] as const;

export const PROMOTION_REQUIREMENT_CODES = [
  'USER_SEMANTIC_CONFIRMATION',
  'DIRECT_REFERENCE_REQUIRED',
  'CALL_PATH_REQUIRED',
] as const;

export const NEXT_ACTION_CODES = [
  'ADD_TERM',
  'ADD_SYMBOL_ANCHOR',
  'CONFIRM_CANDIDATE',
  'INITIALIZE_CODEGRAPH',
  'RETRY_WITH_HIGHER_LIMIT',
] as const;

export const EVIDENCE_OPERATION_CODES = [
  'CODEGRAPH_QUERY',
  'RIPGREP_SEARCH',
  'FILESYSTEM_READ_RANGE',
  'FILESYSTEM_FIND_MATCHES',
] as const;

export const BACKEND_REASON_CODES = [
  'CODEGRAPH_INDEX_MISSING',
  'CODEGRAPH_UNAVAILABLE',
  'CODEGRAPH_NO_RESULT',
  'RIPGREP_UNAVAILABLE',
  'RIPGREP_NO_RESULT',
  'BACKEND_PROCESS_FAILED',
  'BACKEND_ABORTED',
] as const;

export const LIMIT_REASON_CODES = [
  'MAX_FILES_REACHED',
  'MAX_CONFIRMED_REACHED',
  'MAX_CANDIDATES_REACHED',
  'MAX_FILE_BYTES_REACHED',
  'MAX_EXCERPT_BYTES_REACHED',
  'TIMEOUT_REACHED',
] as const;

export const EXCLUSION_REASON_CODES = [
  'NEGATIVE_TERM_MATCH',
  'OUTSIDE_LAYER_HINT',
  'DUPLICATE_LOCATION',
  'UNVERIFIED_FILE_CONTENT',
] as const;

export const TOOL_ERROR_CODES = [
  'INVALID_INPUT',
  'INVALID_REPOSITORY',
  'PATH_OUTSIDE_ROOT',
  'INTERNAL_ERROR',
] as const;

export const EVIDENCE_CLASS_PRIORITY = Object.freeze({
  confirmed: 0,
  candidate: 1,
} as const);

export const EVIDENCE_ROLE_PRIORITY = Object.freeze({
  'value-mapping': 0,
  'execution-site': 1,
  definition: 2,
  reference: 3,
  related: 4,
} as const);

export const EVIDENCE_SOURCE_PRIORITY = Object.freeze({
  codegraph: 0,
  ripgrep: 1,
  filesystem: 2,
} as const);

export const DEFAULT_LOCATE_LIMITS = Object.freeze({
  maxFiles: 8,
  maxConfirmed: 8,
  maxCandidates: 8,
  timeoutMs: 10_000,
} as const);

export const LOCATE_LIMIT_MAXIMUMS = Object.freeze({
  maxFiles: 20,
  maxConfirmed: 20,
  maxCandidates: 20,
  timeoutMs: 30_000,
} as const);

export const LOCATE_INPUT_MAX_BYTES = 16 * 1024;
export const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_EXCERPT_BYTES = 16 * 1024;
export const DEFAULT_MAX_EXCERPT_LINES = 80;
