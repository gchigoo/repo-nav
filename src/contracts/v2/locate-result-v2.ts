import { z } from 'zod';

import {
  LOCATE_RESULT_RESOURCE_BUDGETS_V2,
  isUtf8ByteLengthAtMostV2,
  utf8ByteLengthV2,
} from './locate-result-resource-budget-contract-v2.js';

const BUDGETS_V2 = LOCATE_RESULT_RESOURCE_BUDGETS_V2;

export const LOCATE_STATUSES_V2 = Object.freeze([
  'ok',
  'partial',
  'no_result',
  'backend_unavailable',
  'timeout',
  'cancelled',
] as const);
export const REPO_LAYERS_V2 = Object.freeze([
  'client',
  'server',
  'db',
  'test',
  'docs',
  'config',
  'unknown',
] as const);
export const ANCHOR_KINDS_V2 = Object.freeze([
  'symbol',
  'file',
  'table',
  'route',
  'term',
] as const);
export const NEXT_ACTION_CODES_V2 = Object.freeze([
  'ADD_TERM',
  'ADD_SYMBOL_ANCHOR',
  'CONFIRM_CANDIDATE',
  'INITIALIZE_CODEGRAPH',
  'RETRY_WITH_HIGHER_LIMIT',
] as const);
export const EVIDENCE_ROLES_V2 = Object.freeze([
  'execution-site',
  'value-mapping',
  'definition',
  'reference',
  'related',
] as const);
export const EVIDENCE_SOURCES_V2 = Object.freeze([
  'codegraph',
  'ripgrep',
  'filesystem',
] as const);
export const EVIDENCE_OPERATION_CODES_V2 = Object.freeze([
  'CODEGRAPH_QUERY',
  'RIPGREP_SEARCH',
  'FILESYSTEM_READ_RANGE',
  'FILESYSTEM_FIND_MATCHES',
] as const);
export const REDACTION_REASON_CODES_V2 = Object.freeze([
  'SECRET_LIKE_VALUE',
  'CONNECTION_STRING',
  'PERSONAL_DATA',
  'BINARY_OR_OVERSIZED_CONTENT',
  'UNTRUSTED_CONTROL_CHARACTERS',
] as const);
export const CONFIRMED_REASON_CODES_V2 = Object.freeze([
  'EXACT_TERM_MATCH',
  'EXACT_SYMBOL_ANCHOR',
  'DIRECT_ALIAS_MAPPING',
] as const);
export const CANDIDATE_REASON_CODES_V2 = Object.freeze([
  'EXACT_TERM_WITHOUT_DIRECT_MAPPING',
  'SYMBOL_REFERENCE_ONLY',
  'SAME_SCOPE_SIMILAR_IDENTIFIER',
  'SAME_ENTITY_SIBLING',
  'ALIAS_SOURCE_NEIGHBOR',
  'SECONDARY_BACKEND_HIT',
  'UNSUPPORTED_LANGUAGE_LITERAL',
] as const);
export const PROMOTION_REQUIREMENT_CODES_V2 = Object.freeze([
  'USER_SEMANTIC_CONFIRMATION',
  'DIRECT_REFERENCE_REQUIRED',
  'CALL_PATH_REQUIRED',
  'SUPPORTED_LANGUAGE_ADAPTER_REQUIRED',
] as const);
export const SEARCH_BACKEND_IDS_V2 = Object.freeze([
  'codegraph',
  'ripgrep',
] as const);
export const BACKEND_REASON_CODES_V2 = Object.freeze([
  'CODEGRAPH_INDEX_MISSING',
  'CODEGRAPH_UNAVAILABLE',
  'CODEGRAPH_NO_RESULT',
  'RIPGREP_UNAVAILABLE',
  'RIPGREP_NO_RESULT',
  'BACKEND_PROCESS_FAILED',
  'BACKEND_ABORTED',
] as const);
export const LIMIT_REASON_CODES_V2 = Object.freeze([
  'MAX_FILES_REACHED',
  'MAX_CONFIRMED_REACHED',
  'MAX_CANDIDATES_REACHED',
  'MAX_FILE_BYTES_REACHED',
  'MAX_EXCERPT_BYTES_REACHED',
  'MAX_BACKEND_HITS_REACHED',
  'TIMEOUT_REACHED',
] as const);
export const COVERAGE_DEGRADATION_CODES_V2 = Object.freeze([
  'SNAPSHOT_CHANGED',
  'SEMANTIC_LANGUAGE_UNSUPPORTED',
  'BACKEND_EARLY_STOPPED',
  'PROCESS_OUTPUT_LIMIT_REACHED',
  'LOCATION_REDACTED',
] as const);
export const UPSTREAM_DEGRADATION_CODES_V2 = Object.freeze([
  'SNAPSHOT_CHANGED',
  'SEMANTIC_LANGUAGE_UNSUPPORTED',
  'BACKEND_EARLY_STOPPED',
  'PROCESS_OUTPUT_LIMIT_REACHED',
] as const);
export const EXCLUSION_REASON_CODES_V2 = Object.freeze([
  'NEGATIVE_TERM_MATCH',
  'OUTSIDE_LAYER_HINT',
  'DUPLICATE_LOCATION',
  'UNVERIFIED_FILE_CONTENT',
  'SNAPSHOT_CHANGED',
] as const);
export const REDACTED_FIELDS_V2 = Object.freeze([
  'file',
  'symbol',
  'excerpt',
] as const);
export const TOOL_ERROR_CODES_V2 = Object.freeze([
  'INVALID_INPUT',
  'INVALID_REPOSITORY',
  'PATH_OUTSIDE_ROOT',
  'INTERNAL_ERROR',
] as const);

const LocateStatusV2Schema = z.enum(LOCATE_STATUSES_V2);
const AnchorKindV2Schema = z.enum(ANCHOR_KINDS_V2);
const NextActionCodeV2Schema = z.enum(NEXT_ACTION_CODES_V2);
const EvidenceRoleV2Schema = z.enum(EVIDENCE_ROLES_V2);
const SearchBackendIdV2Schema = z.enum(SEARCH_BACKEND_IDS_V2);
const BackendReasonCodeV2Schema = z.enum(BACKEND_REASON_CODES_V2);
const ExclusionReasonCodeV2Schema = z.enum(EXCLUSION_REASON_CODES_V2);
const RedactedFieldNameV2Schema = z.enum(REDACTED_FIELDS_V2);
const ToolErrorCodeV2Schema = z.enum(TOOL_ERROR_CODES_V2);

function uniqueArray<T extends z.ZodType>(schema: T, minimum = 0) {
  return z
    .array(schema)
    .min(minimum)
    .refine((values) => new Set(values).size === values.length, {
      message: 'Array values must be unique.',
    })
    .readonly();
}

function canonicalArray<const TValues extends readonly [string, ...string[]]>(
  values: TValues,
  minimum = 0,
) {
  const index = new Map(values.map((value, position) => [value, position]));
  return uniqueArray(z.enum(values), minimum).refine(
    (items) =>
      items.every(
        (item, position) =>
          position === 0 ||
          (index.get(items[position - 1]!) ?? -1) < (index.get(item) ?? -1),
      ),
    { message: 'Array values must follow canonical schema order.' },
  );
}

const EvidenceLinesV2Schema = z
  .tuple([z.int().positive(), z.int().positive()])
  .refine(([start, end]) => start <= end, {
    message: 'Evidence line range is reversed.',
  })
  .readonly();

const NormalizedSearchTermV2Schema = z
  .strictObject({
    value: z
      .string()
      .min(1)
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(
            value,
            BUDGETS_V2.normalizedTerms.maxItemUtf8Bytes,
          ),
        { message: 'Normalized term exceeds UTF-8 byte budget.' },
      ),
    caseSensitive: z.boolean(),
  })
  .readonly();

const FieldRedactionV2Schema = z
  .strictObject({
    applied: z.literal(true),
    reasonCodes: canonicalArray(REDACTION_REASON_CODES_V2, 1),
  })
  .readonly();

const PUBLIC_TOKEN_PLACEHOLDER_V2 = '[REDACTED]';
const PUBLIC_OVERSIZED_PLACEHOLDER_V2 =
  '[REDACTED:BINARY_OR_OVERSIZED_CONTENT]';
const UNSAFE_PUBLIC_TEXT_CHARACTERS_V2 =
  /[\u0000-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const UNSAFE_PUBLIC_EXCERPT_CHARACTERS_V2 =
  /[\u0000-\u0008\u000b-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

function isSafePublicText(value: string): boolean {
  return !UNSAFE_PUBLIC_TEXT_CHARACTERS_V2.test(value);
}

function isSafePublicExcerpt(value: string): boolean {
  return !UNSAFE_PUBLIC_EXCERPT_CHARACTERS_V2.test(value);
}

function containsPublicReplacement(value: string): boolean {
  return (
    value.includes(PUBLIC_TOKEN_PLACEHOLDER_V2) ||
    value.includes(PUBLIC_OVERSIZED_PLACEHOLDER_V2)
  );
}

const PublicSearchTermV2Schema = z
  .strictObject({
    value: z
      .string()
      .min(1)
      .refine(isSafePublicText, {
        message: 'Public search terms must be display-safe.',
      })
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(value, BUDGETS_V2.public.maxTermUtf8Bytes),
        { message: 'Public search term exceeds UTF-8 byte budget.' },
      ),
    caseSensitive: z.boolean(),
    redaction: FieldRedactionV2Schema.optional(),
  })
  .readonly()
  .superRefine((term, context) => {
    if (
      term.redaction !== undefined &&
      !containsPublicReplacement(term.value)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Search-term redaction metadata requires a public replacement token.',
        path: ['redaction'],
      });
    }
  });

function isNormalizedRepositoryLocator(value: string): boolean {
  if (
    value.length === 0 ||
    value === '.' ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    /^[A-Za-z]:/u.test(value)
  ) {
    return false;
  }
  return value
    .split('/')
    .every(
      (segment) => segment.length > 0 && segment !== '.' && segment !== '..',
    );
}

function isSafePublicResolvableLocator(value: string): boolean {
  return isNormalizedRepositoryLocator(value) && isSafePublicText(value);
}

const EvidenceProvenanceV2Schema = z
  .strictObject({
    discoveredBy: canonicalArray(EVIDENCE_SOURCES_V2, 1),
    verifiedBy: z.literal('filesystem'),
    operations: canonicalArray(EVIDENCE_OPERATION_CODES_V2, 1),
  })
  .readonly();

const UnsafeEvidenceLocationV2Schema = z
  .strictObject({
    file: z
      .string()
      .min(1)
      .refine(isNormalizedRepositoryLocator, {
        message:
          'Raw evidence file must be a normalized repository-relative POSIX locator.',
      })
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(value, BUDGETS_V2.raw.maxFileUtf8Bytes) &&
          value.split('/').length <= BUDGETS_V2.raw.maxPathSegments,
        { message: 'Raw evidence file exceeds path byte/segment budget.' },
      ),
    symbol: z
      .string()
      .min(1)
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(value, BUDGETS_V2.raw.maxSymbolUtf8Bytes),
        { message: 'Raw evidence symbol exceeds UTF-8 byte budget.' },
      )
      .optional(),
    lines: EvidenceLinesV2Schema,
    excerpt: z
      .string()
      .min(1)
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(value, BUDGETS_V2.raw.maxExcerptUtf8Bytes),
        { message: 'Raw evidence excerpt exceeds UTF-8 byte budget.' },
      ),
  })
  .readonly();

const RedactedFieldV2Schema = z
  .strictObject({
    field: RedactedFieldNameV2Schema,
    reasonCodes: canonicalArray(REDACTION_REASON_CODES_V2, 1),
  })
  .readonly();

const EvidenceLocationV2Schema = z
  .strictObject({
    file: z
      .string()
      .min(1)
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(value, BUDGETS_V2.public.maxFileUtf8Bytes),
        { message: 'Public file exceeds UTF-8 byte budget.' },
      ),
    resolvable: z.boolean(),
    symbol: z
      .string()
      .min(1)
      .refine(isSafePublicText, {
        message: 'Public symbols must be display-safe.',
      })
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(value, BUDGETS_V2.public.maxSymbolUtf8Bytes),
        { message: 'Public symbol exceeds UTF-8 byte budget.' },
      )
      .optional(),
    lines: EvidenceLinesV2Schema,
    excerpt: z
      .string()
      .min(1)
      .refine(isSafePublicExcerpt, {
        message:
          'Public excerpts may contain canonical LF/TAB but no other display controls.',
      })
      .refine(
        (value) =>
          isUtf8ByteLengthAtMostV2(
            value,
            BUDGETS_V2.public.maxExcerptUtf8Bytes,
          ),
        { message: 'Public excerpt exceeds UTF-8 byte budget.' },
      ),
    redaction: z
      .strictObject({
        applied: z.literal(true),
        fields: z
          .array(RedactedFieldV2Schema)
          .min(1)
          .refine(
            (fields) =>
              new Set(fields.map((field) => field.field)).size ===
              fields.length,
            { message: 'Redacted fields must be unique.' },
          )
          .refine(
            (fields) => {
              const order = new Map(
                REDACTED_FIELDS_V2.map((field, index) => [field, index]),
              );
              return fields.every(
                (field, index) =>
                  index === 0 ||
                  (order.get(fields[index - 1]!.field) ?? -1) <
                    (order.get(field.field) ?? -1),
              );
            },
            { message: 'Redacted fields must use canonical order.' },
          )
          .readonly(),
      })
      .readonly()
      .optional(),
  })
  .readonly()
  .superRefine((location, context) => {
    const fileMetadata = location.redaction?.fields.some(
      (field) => field.field === 'file',
    );
    const symbolMetadata = location.redaction?.fields.some(
      (field) => field.field === 'symbol',
    );
    const excerptMetadata = location.redaction?.fields.some(
      (field) => field.field === 'excerpt',
    );
    if (
      (!location.resolvable &&
        (location.file !== '[REDACTED_PATH]' || !fileMetadata)) ||
      (location.resolvable && fileMetadata)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'resolvable=false requires the path placeholder and file metadata; resolvable=true forbids file metadata.',
        path: ['resolvable'],
      });
    }
    if (location.resolvable && !isSafePublicResolvableLocator(location.file)) {
      context.addIssue({
        code: 'custom',
        message:
          'Resolvable public files must be display-safe normalized repository-relative POSIX locators.',
        path: ['file'],
      });
    }
    if (
      symbolMetadata &&
      (location.symbol === undefined ||
        !containsPublicReplacement(location.symbol))
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Symbol redaction metadata requires a public replacement token.',
        path: ['redaction'],
      });
    }
    if (excerptMetadata && !containsPublicReplacement(location.excerpt)) {
      context.addIssue({
        code: 'custom',
        message:
          'Excerpt redaction metadata requires a public replacement token.',
        path: ['redaction'],
      });
    }
  });

const unsafeConfirmedEvidenceV2Schema = z
  .strictObject({
    evidenceClass: z.literal('confirmed'),
    role: EvidenceRoleV2Schema,
    location: UnsafeEvidenceLocationV2Schema,
    provenance: EvidenceProvenanceV2Schema,
    reasonCodes: canonicalArray(CONFIRMED_REASON_CODES_V2, 1),
  })
  .readonly();

const unsafeCandidateEvidenceV2Schema = z
  .strictObject({
    evidenceClass: z.literal('candidate'),
    role: EvidenceRoleV2Schema,
    location: UnsafeEvidenceLocationV2Schema,
    provenance: EvidenceProvenanceV2Schema,
    reasonCodes: canonicalArray(CANDIDATE_REASON_CODES_V2, 1),
    promotionRequirements: canonicalArray(PROMOTION_REQUIREMENT_CODES_V2, 1),
  })
  .readonly();

const PublicEvidenceIdV2Schema = z.string().regex(/^evidence:v2:\d{4,}$/u);

const ConfirmedEvidenceV2Schema = z
  .strictObject({
    evidenceClass: z.literal('confirmed'),
    id: PublicEvidenceIdV2Schema,
    role: EvidenceRoleV2Schema,
    location: EvidenceLocationV2Schema,
    provenance: EvidenceProvenanceV2Schema,
    reasonCodes: canonicalArray(CONFIRMED_REASON_CODES_V2, 1),
  })
  .readonly();

const CandidateEvidenceV2Schema = z
  .strictObject({
    evidenceClass: z.literal('candidate'),
    id: PublicEvidenceIdV2Schema,
    role: EvidenceRoleV2Schema,
    location: EvidenceLocationV2Schema,
    provenance: EvidenceProvenanceV2Schema,
    reasonCodes: canonicalArray(CANDIDATE_REASON_CODES_V2, 1),
    promotionRequirements: canonicalArray(PROMOTION_REQUIREMENT_CODES_V2, 1),
  })
  .readonly();

const BackendAttemptV2Schema = z
  .strictObject({
    backend: SearchBackendIdV2Schema,
    status: z.enum(['used', 'unavailable', 'failed']),
    completion: z.enum(['complete', 'incomplete']),
    termination: z.enum([
      'none',
      'timeout',
      'output-limit',
      'early-stop',
      'aborted',
      'process-error',
    ]),
    reasonCode: BackendReasonCodeV2Schema.optional(),
    hitCount: z.int().nonnegative(),
  })
  .readonly()
  .superRefine((attempt, context) => {
    const expectedNoResult =
      attempt.backend === 'codegraph'
        ? 'CODEGRAPH_NO_RESULT'
        : 'RIPGREP_NO_RESULT';
    const unavailableReasons =
      attempt.backend === 'codegraph'
        ? new Set(['CODEGRAPH_INDEX_MISSING', 'CODEGRAPH_UNAVAILABLE'])
        : new Set(['RIPGREP_UNAVAILABLE']);
    let valid = false;
    if (attempt.status === 'used' && attempt.completion === 'complete') {
      valid =
        attempt.termination === 'none' &&
        (attempt.hitCount === 0
          ? attempt.reasonCode === expectedNoResult
          : attempt.reasonCode === undefined);
    } else if (
      attempt.status === 'used' &&
      attempt.completion === 'incomplete'
    ) {
      valid =
        (attempt.termination === 'early-stop' &&
          attempt.reasonCode === undefined &&
          attempt.hitCount > 0) ||
        (attempt.termination === 'output-limit' &&
          attempt.reasonCode === undefined) ||
        (attempt.termination === 'aborted' &&
          attempt.reasonCode === 'BACKEND_ABORTED');
    } else if (attempt.status === 'unavailable') {
      valid =
        attempt.completion === 'incomplete' &&
        attempt.termination === 'none' &&
        attempt.hitCount === 0 &&
        attempt.reasonCode !== undefined &&
        unavailableReasons.has(attempt.reasonCode);
    } else if (attempt.status === 'failed') {
      valid =
        attempt.completion === 'incomplete' &&
        (attempt.termination === 'timeout' ||
          attempt.termination === 'process-error') &&
        attempt.reasonCode === 'BACKEND_PROCESS_FAILED';
    }
    if (!valid) {
      context.addIssue({
        code: 'custom',
        message:
          'Backend status, completion, termination, reason and hitCount contradict the frozen ledger.',
      });
    }
  });

const RepositorySnapshotCoverageV2Schema = z
  .strictObject({
    gitState: z.enum(['clean', 'dirty', 'not-git', 'unknown']),
    consistency: z.enum(['stable', 'changed', 'unknown']),
    filesChecked: z.int().nonnegative(),
    discardedEvidenceCount: z.int().nonnegative(),
    /** 无绝对路径：`HEAD:<sha>` 或 `HEAD:<sha>+dirty:<fp>`；未知可省略 */
    snapshotRef: z.string().max(128).optional(),
  })
  .readonly()
  .superRefine((snapshot, context) => {
    if (
      snapshot.consistency === 'stable' &&
      (snapshot.filesChecked < 1 || snapshot.discardedEvidenceCount !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Stable snapshots require checked files and zero discarded evidence.',
      });
    }
    if (
      snapshot.consistency === 'unknown' &&
      (snapshot.filesChecked !== 0 || snapshot.discardedEvidenceCount !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unknown snapshots cannot report checked or discarded files.',
      });
    }
    if (
      snapshot.snapshotRef !== undefined &&
      (/[\\/]/u.test(snapshot.snapshotRef) ||
        /^[A-Za-z]:/u.test(snapshot.snapshotRef))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'snapshotRef must not contain absolute or path separators.',
      });
    }
  });

const DEFAULT_EFFECTIVE_SCOPE_V2 = Object.freeze([
  'client',
  'server',
  'db',
  'config',
  'unknown',
] as const);

const ScopeCoverageV2Schema = z
  .strictObject({
    requested: canonicalArray(REPO_LAYERS_V2),
    effective: canonicalArray(REPO_LAYERS_V2),
    policyVersion: z.literal('repo-scope-v1'),
    unmatchedLayers: canonicalArray(REPO_LAYERS_V2),
  })
  .readonly()
  .superRefine((scope, context) => {
    const effective = new Set(scope.effective);
    if (scope.unmatchedLayers.some((layer) => !effective.has(layer))) {
      context.addIssue({
        code: 'custom',
        message: 'Unmatched layers must be a subset of effective layers.',
        path: ['unmatchedLayers'],
      });
    }
    const expected =
      scope.requested.length === 0
        ? DEFAULT_EFFECTIVE_SCOPE_V2
        : scope.requested;
    if (
      expected.length !== scope.effective.length ||
      expected.some((layer, index) => scope.effective[index] !== layer)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Effective scope must equal the frozen default or explicit request.',
        path: ['effective'],
      });
    }
  });

const CapabilityCoverageV2Schema = z
  .strictObject({
    textSearch: z.literal('supported-text-files'),
    semanticClassification: z
      .tuple([
        z.literal('typescript'),
        z.literal('javascript'),
        z.literal('sql'),
      ])
      .readonly(),
    unsupportedLanguageHits: z.int().nonnegative(),
  })
  .readonly();

const UnsatisfiedAnchorV2Schema = z
  .strictObject({
    requestIndex: z
      .int()
      .nonnegative()
      .max(BUDGETS_V2.coverage.maxUnsatisfiedAnchorRequestIndex),
    kind: AnchorKindV2Schema,
    satisfaction: z.enum(['candidate', 'none']),
    reason: z.enum(['BUDGET_EXCEEDED', 'NOT_FOUND', 'UNVERIFIED']),
  })
  .readonly()
  .superRefine((anchor, context) => {
    if (
      (anchor.satisfaction === 'candidate') !==
      (anchor.reason === 'UNVERIFIED')
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Candidate anchor satisfaction must use the UNVERIFIED reason.',
      });
    }
  });

const exclusionSummaryV2Schema = z
  .partialRecord(ExclusionReasonCodeV2Schema, z.int().positive())
  .readonly();

const createCoverageReportV2Schema = <
  const TDegradationValues extends readonly [string, ...string[]],
>(
  degradationValues: TDegradationValues,
) =>
  z
    .strictObject({
      backends: z
        .array(BackendAttemptV2Schema)
        .max(BUDGETS_V2.coverage.maxBackends)
        .readonly(),
      strategyComplete: z.boolean(),
      fallbackChecked: z.boolean(),
      indexState: z.enum([
        'available',
        'missing',
        'unavailable',
        'error',
        'unknown',
      ]),
      indexFreshness: z.enum(['not-applicable', 'unknown', 'possibly-stale']),
      limitsReached: canonicalArray(LIMIT_REASON_CODES_V2),
      degradations: canonicalArray(degradationValues),
      exclusionSummary: exclusionSummaryV2Schema,
      abortSource: z.enum(['none', 'caller', 'deadline']),
      unsatisfiedAnchors: z
        .array(UnsatisfiedAnchorV2Schema)
        .max(BUDGETS_V2.coverage.maxUnsatisfiedAnchors)
        .readonly(),
      snapshot: RepositorySnapshotCoverageV2Schema,
      scope: ScopeCoverageV2Schema,
      capabilities: CapabilityCoverageV2Schema,
    })
    .readonly()
    .superRefine((coverage, context) => {
      if (
        new Set(coverage.backends.map((attempt) => attempt.backend)).size !==
        coverage.backends.length
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Each backend may appear at most once.',
          path: ['backends'],
        });
      }
      if (coverage.backends.length > 1 && !coverage.fallbackChecked) {
        context.addIssue({
          code: 'custom',
          message:
            'Executing more than one backend requires fallbackChecked=true.',
          path: ['fallbackChecked'],
        });
      }
      for (
        let index = 0;
        index < coverage.unsatisfiedAnchors.length;
        index += 1
      ) {
        const previous = coverage.unsatisfiedAnchors[index - 1];
        const current = coverage.unsatisfiedAnchors[index]!;
        if (
          previous !== undefined &&
          previous.requestIndex >= current.requestIndex
        ) {
          context.addIssue({
            code: 'custom',
            message:
              'Unsatisfied anchor request indexes must be unique and ascending.',
            path: ['unsatisfiedAnchors', index],
          });
        }
        if (current.reason === 'NOT_FOUND' && !coverage.strategyComplete) {
          context.addIssue({
            code: 'custom',
            message: 'NOT_FOUND requires the relevant strategy to be complete.',
            path: ['unsatisfiedAnchors', index, 'reason'],
          });
        }
      }
      const timeoutLimit = coverage.limitsReached.includes('TIMEOUT_REACHED');
      if (
        (coverage.abortSource === 'deadline') !== timeoutLimit ||
        (coverage.abortSource === 'caller' && timeoutLimit)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'TIMEOUT_REACHED is owned exclusively by a request deadline.',
          path: ['limitsReached'],
        });
      }
      const unsupported = coverage.capabilities.unsupportedLanguageHits > 0;
      const unsupportedDegradation = coverage.degradations.includes(
        'SEMANTIC_LANGUAGE_UNSUPPORTED',
      );
      if (unsupported !== unsupportedDegradation) {
        context.addIssue({
          code: 'custom',
          message:
            'Unsupported language hits and degradation must agree exactly.',
          path: ['capabilities', 'unsupportedLanguageHits'],
        });
      }
      const snapshotChanged = coverage.snapshot.consistency === 'changed';
      const snapshotDegradation =
        coverage.degradations.includes('SNAPSHOT_CHANGED');
      const snapshotExclusions =
        coverage.exclusionSummary.SNAPSHOT_CHANGED ?? 0;
      if (
        snapshotChanged !== snapshotDegradation ||
        snapshotChanged !== snapshotExclusions > 0 ||
        (snapshotChanged &&
          coverage.snapshot.discardedEvidenceCount !== snapshotExclusions)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Changed snapshot, degradation and exclusion summary must agree.',
          path: ['snapshot'],
        });
      }
      const incompleteIndexes = coverage.backends
        .map((attempt, index) =>
          attempt.completion === 'incomplete' ? index : -1,
        )
        .filter((index) => index >= 0);
      if (
        coverage.strategyComplete &&
        incompleteIndexes.some(
          (index) =>
            !coverage.backends
              .slice(index + 1)
              .some(
                (attempt) =>
                  attempt.status === 'used' &&
                  attempt.completion === 'complete',
              ),
        )
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Every incomplete attempt requires a later complete fallback before strategyComplete can be true.',
          path: ['strategyComplete'],
        });
      }
      const hasEarlyStop = coverage.backends.some(
        (attempt) => attempt.termination === 'early-stop',
      );
      const hasOutputLimit = coverage.backends.some(
        (attempt) => attempt.termination === 'output-limit',
      );
      const hasBackendHitLimit = coverage.limitsReached.includes(
        'MAX_BACKEND_HITS_REACHED',
      );
      const hasEarlyStopDegradation = coverage.degradations.includes(
        'BACKEND_EARLY_STOPPED',
      );
      const hasOutputLimitDegradation = coverage.degradations.includes(
        'PROCESS_OUTPUT_LIMIT_REACHED',
      );
      if (
        hasEarlyStop !== hasBackendHitLimit ||
        hasEarlyStopDegradation !==
          (hasEarlyStop && !coverage.strategyComplete) ||
        hasOutputLimitDegradation !==
          (hasOutputLimit && !coverage.strategyComplete)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Termination, limit and degradation facts do not match fallback completeness.',
          path: ['backends'],
        });
      }
      const hasAbortedAttempt = coverage.backends.some(
        (attempt) => attempt.termination === 'aborted',
      );
      if (coverage.abortSource === 'none' && hasAbortedAttempt) {
        context.addIssue({
          code: 'custom',
          message:
            'An aborted backend attempt requires caller or deadline ownership.',
          path: ['abortSource'],
        });
      }
    });

export const CoverageReportV2Schema = createCoverageReportV2Schema(
  COVERAGE_DEGRADATION_CODES_V2,
);
export const FinalizedUnsafeCoverageReportV2Schema =
  createCoverageReportV2Schema(UPSTREAM_DEGRADATION_CODES_V2);
export type CoverageReportV2 = z.infer<typeof CoverageReportV2Schema>;
export type FinalizedUnsafeCoverageReportV2 = z.infer<
  typeof FinalizedUnsafeCoverageReportV2Schema
>;

function canonicalizeValues<const TValue extends string>(
  values: readonly TValue[],
  order: readonly TValue[],
): readonly TValue[] {
  const present = new Set(values);
  return Object.freeze(order.filter((value) => present.has(value)));
}

export function canonicalizeCoverageV2(
  coverage: FinalizedUnsafeCoverageReportV2,
  locationRedacted: boolean,
): CoverageReportV2 {
  const exclusionSummary: Partial<
    Record<(typeof EXCLUSION_REASON_CODES_V2)[number], number>
  > = {};
  for (const code of EXCLUSION_REASON_CODES_V2) {
    const count = coverage.exclusionSummary[code];
    if (count !== undefined) exclusionSummary[code] = count;
  }
  const degradations = canonicalizeValues(
    [
      ...coverage.degradations,
      ...(locationRedacted ? (['LOCATION_REDACTED'] as const) : []),
    ],
    COVERAGE_DEGRADATION_CODES_V2,
  );
  return {
    backends: coverage.backends,
    strategyComplete: coverage.strategyComplete,
    fallbackChecked: coverage.fallbackChecked,
    indexState: coverage.indexState,
    indexFreshness: coverage.indexFreshness,
    limitsReached: canonicalizeValues(
      coverage.limitsReached,
      LIMIT_REASON_CODES_V2,
    ),
    degradations,
    exclusionSummary,
    abortSource: coverage.abortSource,
    unsatisfiedAnchors: coverage.unsatisfiedAnchors,
    snapshot: coverage.snapshot,
    scope: {
      requested: canonicalizeValues(coverage.scope.requested, REPO_LAYERS_V2),
      effective: canonicalizeValues(coverage.scope.effective, REPO_LAYERS_V2),
      unmatchedLayers: canonicalizeValues(
        coverage.scope.unmatchedLayers,
        REPO_LAYERS_V2,
      ),
      policyVersion: 'repo-scope-v1',
    },
    capabilities: coverage.capabilities,
  };
}

export function deriveLocateStatusV2(
  coverage: CoverageReportV2 | FinalizedUnsafeCoverageReportV2,
  retainedEvidenceCount: number,
): z.infer<typeof LocateStatusV2Schema> {
  // F6：caller→cancelled；deadline→timeout；backend local abort 不经 abortSource
  if (coverage.abortSource === 'caller') {
    return 'cancelled';
  }
  if (coverage.abortSource === 'deadline') {
    return 'timeout';
  }
  if (
    retainedEvidenceCount === 0 &&
    !coverage.strategyComplete &&
    coverage.backends.length > 0 &&
    coverage.backends.every(
      (attempt) =>
        attempt.status === 'unavailable' || attempt.status === 'failed',
    )
  ) {
    return 'backend_unavailable';
  }
  if (
    !coverage.strategyComplete ||
    coverage.degradations.length > 0 ||
    coverage.backends.some(
      (attempt) =>
        attempt.status === 'used' && attempt.completion === 'incomplete',
    ) ||
    coverage.unsatisfiedAnchors.some(
      (anchor) =>
        anchor.reason === 'BUDGET_EXCEEDED' || anchor.reason === 'UNVERIFIED',
    )
  ) {
    return 'partial';
  }
  return retainedEvidenceCount > 0 ? 'ok' : 'no_result';
}

const FinalizedUnsafeEvidencePackV2Schema = z
  .strictObject({
    normalizedTerms: z
      .array(NormalizedSearchTermV2Schema)
      .min(1)
      .max(BUDGETS_V2.normalizedTerms.maxItems)
      .readonly(),
    confirmed: z
      .array(unsafeConfirmedEvidenceV2Schema)
      .max(BUDGETS_V2.evidence.maxConfirmed)
      .readonly(),
    candidates: z
      .array(unsafeCandidateEvidenceV2Schema)
      .max(BUDGETS_V2.evidence.maxCandidates)
      .readonly(),
    coverage: FinalizedUnsafeCoverageReportV2Schema,
    nextActions: uniqueArray(NextActionCodeV2Schema),
  })
  .readonly()
  .superRefine((pack, context) => {
    const evidenceCount = pack.confirmed.length + pack.candidates.length;
    if (evidenceCount > BUDGETS_V2.evidence.maxTotal) {
      context.addIssue({
        code: 'custom',
        message: 'Total evidence exceeds budget.',
        path: ['confirmed'],
      });
    }
    let termTotalBytes = 0;
    for (const term of pack.normalizedTerms) {
      termTotalBytes += utf8ByteLengthV2(term.value);
    }
    if (termTotalBytes > BUDGETS_V2.normalizedTerms.maxTotalUtf8Bytes) {
      context.addIssue({
        code: 'custom',
        message: 'Normalized terms exceed total UTF-8 byte budget.',
        path: ['normalizedTerms'],
      });
    }
    const retainedFileCount = new Set(
      [...pack.confirmed, ...pack.candidates].map(
        (evidence) => evidence.location.file,
      ),
    ).size;
    if (pack.coverage.snapshot.consistency === 'unknown' && evidenceCount > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Unknown snapshots cannot retain evidence.',
        path: ['coverage', 'snapshot'],
      });
    }
    if (retainedFileCount > pack.coverage.snapshot.filesChecked) {
      context.addIssue({
        code: 'custom',
        message:
          'Retained evidence cannot reference more unique files than the snapshot checked.',
        path: ['coverage', 'snapshot', 'filesChecked'],
      });
    }
  });

const UnsafeToolErrorV2Schema = z
  .strictObject({
    code: ToolErrorCodeV2Schema,
    suggestedAction: z.literal('ADD_TERM').optional(),
  })
  .readonly()
  .superRefine((error, context) => {
    if (error.code !== 'INVALID_INPUT' && error.suggestedAction !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Only INVALID_INPUT may suggest ADD_TERM.',
        path: ['suggestedAction'],
      });
    }
  });

export const FinalizedUnsafeLocateResultV2Schema = z.discriminatedUnion('ok', [
  z
    .strictObject({
      ok: z.literal(true),
      evidence: FinalizedUnsafeEvidencePackV2Schema,
    })
    .readonly(),
  z
    .strictObject({
      ok: z.literal(false),
      error: UnsafeToolErrorV2Schema,
    })
    .readonly(),
]);
export type FinalizedUnsafeLocateResultV2 = z.infer<
  typeof FinalizedUnsafeLocateResultV2Schema
>;

const RepoNavToolErrorV2Schema = z.discriminatedUnion('code', [
  z
    .strictObject({
      code: z.literal('INVALID_INPUT'),
      message: z.literal('Locate request does not match the required schema.'),
      recoverable: z.literal(true),
      suggestedAction: z.literal('ADD_TERM').optional(),
    })
    .readonly(),
  z
    .strictObject({
      code: z.literal('INVALID_REPOSITORY'),
      message: z.literal('Repository root is invalid or unavailable.'),
      recoverable: z.literal(true),
    })
    .readonly(),
  z
    .strictObject({
      code: z.literal('PATH_OUTSIDE_ROOT'),
      message: z.literal('Repository path is outside the configured root.'),
      recoverable: z.literal(false),
    })
    .readonly(),
  z
    .strictObject({
      code: z.literal('INTERNAL_ERROR'),
      message: z.literal('Repository evidence request failed.'),
      recoverable: z.literal(false),
    })
    .readonly(),
]);

const EvidencePackV2Schema = z
  .strictObject({
    schemaVersion: z.literal('2.0'),
    status: LocateStatusV2Schema,
    repositoryRef: z.literal('local-repository'),
    normalizedTerms: z
      .array(PublicSearchTermV2Schema)
      .min(1)
      .max(BUDGETS_V2.normalizedTerms.maxItems)
      .readonly(),
    confirmed: z
      .array(ConfirmedEvidenceV2Schema)
      .max(BUDGETS_V2.evidence.maxConfirmed)
      .readonly(),
    candidates: z
      .array(CandidateEvidenceV2Schema)
      .max(BUDGETS_V2.evidence.maxCandidates)
      .readonly(),
    coverage: CoverageReportV2Schema,
    nextActions: canonicalArray(NEXT_ACTION_CODES_V2),
  })
  .readonly()
  .superRefine((pack, context) => {
    const allEvidence = [...pack.confirmed, ...pack.candidates];
    const retainedFileCount = new Set(
      allEvidence.map((evidence) => evidence.location.file),
    ).size;
    for (let index = 0; index < allEvidence.length; index += 1) {
      const expected = `evidence:v2:${String(index + 1).padStart(4, '0')}`;
      if (allEvidence[index]!.id !== expected) {
        context.addIssue({
          code: 'custom',
          message: `Evidence ID must equal ${expected}.`,
          path:
            index < pack.confirmed.length
              ? ['confirmed', index, 'id']
              : ['candidates', index - pack.confirmed.length, 'id'],
        });
      }
    }
    const hiddenLocations = allEvidence.filter(
      (evidence) => !evidence.location.resolvable,
    ).length;
    const hasLocationDegradation =
      pack.coverage.degradations.includes('LOCATION_REDACTED');
    if (hiddenLocations > 0 !== hasLocationDegradation) {
      context.addIssue({
        code: 'custom',
        message: 'Hidden locations and LOCATION_REDACTED must agree exactly.',
        path: ['coverage', 'degradations'],
      });
    }
    const expectedStatus = deriveLocateStatusV2(
      pack.coverage,
      allEvidence.length,
    );
    if (pack.status !== expectedStatus) {
      context.addIssue({
        code: 'custom',
        message: `Status must be derived as ${expectedStatus}.`,
        path: ['status'],
      });
    }
    if (
      pack.coverage.snapshot.consistency === 'unknown' &&
      allEvidence.length > 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unknown snapshots cannot retain evidence.',
        path: ['coverage', 'snapshot'],
      });
    }
    if (retainedFileCount > pack.coverage.snapshot.filesChecked) {
      context.addIssue({
        code: 'custom',
        message:
          'Public retained evidence cannot reference more unique files than the snapshot checked.',
        path: ['coverage', 'snapshot', 'filesChecked'],
      });
    }
  });

export const LocateResultV2Schema = z.discriminatedUnion('ok', [
  z
    .strictObject({
      ok: z.literal(true),
      evidence: EvidencePackV2Schema,
    })
    .readonly(),
  z
    .strictObject({
      ok: z.literal(false),
      error: RepoNavToolErrorV2Schema,
    })
    .readonly(),
]);
export type LocateResultV2 = z.infer<typeof LocateResultV2Schema>;
export type EvidencePackV2 = z.infer<typeof EvidencePackV2Schema>;
export type PublicSearchTermV2 = z.infer<typeof PublicSearchTermV2Schema>;
export type EvidenceLocationV2 = z.infer<typeof EvidenceLocationV2Schema>;
export type ConfirmedEvidenceV2 = z.infer<typeof ConfirmedEvidenceV2Schema>;
export type CandidateEvidenceV2 = z.infer<typeof CandidateEvidenceV2Schema>;
export type RepoNavToolErrorV2 = z.infer<typeof RepoNavToolErrorV2Schema>;
