/**
 * MCP text projection: lean agent view over a trusted LocateResultV2.
 * structuredContent remains the full schema 2.0 result.
 */

import { z } from 'zod';

import { LOCATE_LIMIT_MAXIMUMS } from '../contracts/constants.js';
import {
  EVIDENCE_ROLES_V2,
  LOCATE_STATUSES_V2,
  type CandidateEvidenceV2,
  type ConfirmedEvidenceV2,
  type LocateResultV2,
  type RepoNavToolErrorV2,
} from '../contracts/v2/locate-result-v2.js';

export const LOCATE_AGENT_VIEW_SCHEMA_VERSION = '2.0-agent' as const;

const IDENTIFIER_PATTERN =
  /(?:[$_]|\p{ID_Start})(?:[$_\u200C\u200D]|\p{ID_Continue})+/gu;

const QUESTION_STOPWORDS = Object.freeze(
  new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'find',
    'for',
    'from',
    'how',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'used',
    'what',
    'where',
    'which',
    'with',
  ]),
);

const AgentEvidenceV2Schema = z
  .strictObject({
    id: z.string().regex(/^evidence:v2:\d{4,}$/u),
    evidenceClass: z.enum(['confirmed', 'candidate']),
    role: z.enum(EVIDENCE_ROLES_V2),
    file: z.string().min(1),
    resolvable: z.boolean(),
    lines: z.tuple([z.int().positive(), z.int().positive()]).readonly(),
    symbol: z.string().min(1).optional(),
    excerpt: z.string().min(1),
    reasonCodes: z.array(z.string().min(1)).min(1).readonly(),
    promotionRequirements: z
      .array(z.string().min(1))
      .min(1)
      .readonly()
      .optional(),
  })
  .readonly();

const AgentNextActionV2Schema = z.discriminatedUnion('code', [
  z
    .strictObject({
      code: z.literal('ADD_TERM'),
      terms: z.array(z.string().min(1)).max(8).readonly(),
    })
    .readonly(),
  z
    .strictObject({
      code: z.literal('ADD_SYMBOL_ANCHOR'),
      symbols: z.array(z.string().min(1)).max(8).readonly(),
    })
    .readonly(),
  z
    .strictObject({
      code: z.literal('CONFIRM_CANDIDATE'),
      evidenceIds: z.array(z.string().min(1)).max(20).readonly(),
    })
    .readonly(),
  z.strictObject({ code: z.literal('INITIALIZE_CODEGRAPH') }).readonly(),
  z
    .strictObject({
      code: z.literal('RETRY_WITH_HIGHER_LIMIT'),
      limits: z
        .strictObject({
          maxFiles: z.int().positive().optional(),
          maxConfirmed: z.int().positive().optional(),
          maxCandidates: z.int().nonnegative().optional(),
          timeoutMs: z.int().positive().optional(),
        })
        .readonly(),
    })
    .readonly(),
]);

export const LocateAgentViewV2Schema = z.discriminatedUnion('ok', [
  z
    .strictObject({
      ok: z.literal(true),
      schemaVersion: z.literal(LOCATE_AGENT_VIEW_SCHEMA_VERSION),
      status: z.enum(LOCATE_STATUSES_V2),
      confirmed: z.array(AgentEvidenceV2Schema).readonly(),
      candidates: z.array(AgentEvidenceV2Schema).readonly(),
      nextActions: z.array(AgentNextActionV2Schema).readonly(),
    })
    .readonly(),
  z
    .strictObject({
      ok: z.literal(false),
      schemaVersion: z.literal(LOCATE_AGENT_VIEW_SCHEMA_VERSION),
      error: z.strictObject({
        code: z.enum([
          'INVALID_INPUT',
          'INVALID_REPOSITORY',
          'PATH_OUTSIDE_ROOT',
          'INTERNAL_ERROR',
        ]),
        message: z.string().min(1),
        recoverable: z.boolean(),
        suggestedAction: z.literal('ADD_TERM').optional(),
      }),
    })
    .readonly(),
]);

export type LocateAgentViewV2 = z.infer<typeof LocateAgentViewV2Schema>;
export type LocateAgentNextActionV2 = z.infer<typeof AgentNextActionV2Schema>;

function asRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Readonly<Record<string, unknown>>;
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }
  return Object.freeze(
    value.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    ),
  );
}

function comparisonKey(value: string): string {
  return value.toLocaleLowerCase('und');
}

function extractIdentifierSuggestions(
  question: string | undefined,
  excluded: readonly string[],
): readonly string[] {
  if (question === undefined || question.length === 0) {
    return Object.freeze([]);
  }
  const excludedKeys = new Set(excluded.map(comparisonKey));
  const seen = new Set<string>();
  const collected: string[] = [];
  for (const match of question.matchAll(IDENTIFIER_PATTERN)) {
    const token = match[0];
    if (token === undefined) {
      continue;
    }
    const folded = comparisonKey(token);
    if (
      folded.length < 3 ||
      QUESTION_STOPWORDS.has(folded) ||
      excludedKeys.has(folded)
    ) {
      continue;
    }
    if (seen.has(folded)) {
      continue;
    }
    seen.add(folded);
    collected.push(token);
    if (collected.length >= 8) {
      break;
    }
  }
  return Object.freeze(collected);
}

function looksLikeIdentifier(value: string): boolean {
  return /^(?:[$_]|\p{ID_Start})(?:[$_\u200C\u200D]|\p{ID_Continue})+$/u.test(
    value,
  );
}

function readRequestHints(request: unknown): Readonly<{
  question: string | undefined;
  terms: readonly string[];
  symbolAnchors: readonly string[];
  limits: Readonly<{
    maxFiles: number | undefined;
    maxConfirmed: number | undefined;
    maxCandidates: number | undefined;
    timeoutMs: number | undefined;
  }>;
}> {
  const record = asRecord(request);
  const question =
    typeof record?.question === 'string' && record.question.length > 0
      ? record.question
      : undefined;
  const terms = asStringArray(record?.terms);
  const anchors = Array.isArray(record?.anchors) ? record.anchors : [];
  const symbolAnchors = Object.freeze(
    anchors.flatMap((anchor) => {
      const item = asRecord(anchor);
      if (item?.kind !== 'symbol' || typeof item.value !== 'string') {
        return [];
      }
      return [item.value];
    }),
  );
  const limits = asRecord(record?.limits);
  return Object.freeze({
    question,
    terms,
    symbolAnchors,
    limits: Object.freeze({
      maxFiles:
        typeof limits?.maxFiles === 'number' ? limits.maxFiles : undefined,
      maxConfirmed:
        typeof limits?.maxConfirmed === 'number'
          ? limits.maxConfirmed
          : undefined,
      maxCandidates:
        typeof limits?.maxCandidates === 'number'
          ? limits.maxCandidates
          : undefined,
      timeoutMs:
        typeof limits?.timeoutMs === 'number' ? limits.timeoutMs : undefined,
    }),
  });
}

function bumpLimit(current: number | undefined, maximum: number): number {
  if (current === undefined || current >= maximum) {
    return maximum;
  }
  return Math.min(maximum, Math.max(current + 1, current * 2));
}

function projectEvidence(
  evidence: ConfirmedEvidenceV2 | CandidateEvidenceV2,
): z.infer<typeof AgentEvidenceV2Schema> {
  return Object.freeze({
    id: evidence.id,
    evidenceClass: evidence.evidenceClass,
    role: evidence.role,
    file: evidence.location.file,
    resolvable: evidence.location.resolvable,
    lines: evidence.location.lines,
    ...(evidence.location.symbol === undefined
      ? {}
      : { symbol: evidence.location.symbol }),
    excerpt: evidence.location.excerpt,
    reasonCodes: evidence.reasonCodes,
    ...('promotionRequirements' in evidence
      ? { promotionRequirements: evidence.promotionRequirements }
      : {}),
  });
}

function projectNextActions(
  result: Extract<LocateResultV2, { readonly ok: true }>,
  request: unknown,
): readonly LocateAgentNextActionV2[] {
  const hints = readRequestHints(request);
  const actions: LocateAgentNextActionV2[] = [];
  for (const code of result.evidence.nextActions) {
    if (code === 'ADD_TERM') {
      actions.push(
        Object.freeze({
          code,
          terms: extractIdentifierSuggestions(hints.question, hints.terms),
        }),
      );
      continue;
    }
    if (code === 'ADD_SYMBOL_ANCHOR') {
      const excluded = [...hints.symbolAnchors];
      const fromQuestion = extractIdentifierSuggestions(
        hints.question,
        excluded,
      );
      const fromTerms =
        fromQuestion.length > 0
          ? fromQuestion
          : Object.freeze(
              hints.terms
                .filter(
                  (term) =>
                    looksLikeIdentifier(term) &&
                    !excluded.some(
                      (anchor) => comparisonKey(anchor) === comparisonKey(term),
                    ),
                )
                .slice(0, 8),
            );
      actions.push(Object.freeze({ code, symbols: fromTerms }));
      continue;
    }
    if (code === 'CONFIRM_CANDIDATE') {
      actions.push(
        Object.freeze({
          code,
          evidenceIds: Object.freeze(
            result.evidence.candidates.map((candidate) => candidate.id),
          ),
        }),
      );
      continue;
    }
    if (code === 'INITIALIZE_CODEGRAPH') {
      actions.push(Object.freeze({ code }));
      continue;
    }
    if (code === 'RETRY_WITH_HIGHER_LIMIT') {
      const reached = new Set(result.evidence.coverage.limitsReached);
      const limits: {
        maxFiles?: number;
        maxConfirmed?: number;
        maxCandidates?: number;
        timeoutMs?: number;
      } = {};
      if (
        reached.has('MAX_FILES_REACHED') ||
        result.evidence.status === 'partial'
      ) {
        if (reached.has('MAX_FILES_REACHED')) {
          limits.maxFiles = bumpLimit(
            hints.limits.maxFiles,
            LOCATE_LIMIT_MAXIMUMS.maxFiles,
          );
        }
        if (reached.has('MAX_CONFIRMED_REACHED')) {
          limits.maxConfirmed = bumpLimit(
            hints.limits.maxConfirmed,
            LOCATE_LIMIT_MAXIMUMS.maxConfirmed,
          );
        }
        if (reached.has('MAX_CANDIDATES_REACHED')) {
          limits.maxCandidates = bumpLimit(
            hints.limits.maxCandidates,
            LOCATE_LIMIT_MAXIMUMS.maxCandidates,
          );
        }
      }
      if (
        reached.has('TIMEOUT_REACHED') ||
        result.evidence.status === 'timeout'
      ) {
        limits.timeoutMs = bumpLimit(
          hints.limits.timeoutMs,
          LOCATE_LIMIT_MAXIMUMS.timeoutMs,
        );
      }
      if (Object.keys(limits).length === 0) {
        limits.maxFiles = LOCATE_LIMIT_MAXIMUMS.maxFiles;
        limits.maxConfirmed = LOCATE_LIMIT_MAXIMUMS.maxConfirmed;
        limits.maxCandidates = LOCATE_LIMIT_MAXIMUMS.maxCandidates;
        limits.timeoutMs = LOCATE_LIMIT_MAXIMUMS.timeoutMs;
      }
      actions.push(Object.freeze({ code, limits: Object.freeze(limits) }));
    }
  }
  return Object.freeze(actions);
}

function projectError(error: RepoNavToolErrorV2): LocateAgentViewV2 {
  return Object.freeze({
    ok: false as const,
    schemaVersion: LOCATE_AGENT_VIEW_SCHEMA_VERSION,
    error: Object.freeze({
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      ...('suggestedAction' in error && error.suggestedAction !== undefined
        ? { suggestedAction: error.suggestedAction }
        : {}),
    }),
  });
}

/**
 * Project a trusted public locate result into the MCP agent text view.
 */
export function projectLocateAgentViewV2(
  result: LocateResultV2,
  request?: unknown,
): LocateAgentViewV2 {
  if (!result.ok) {
    return projectError(result.error);
  }
  return Object.freeze({
    ok: true as const,
    schemaVersion: LOCATE_AGENT_VIEW_SCHEMA_VERSION,
    status: result.evidence.status,
    confirmed: Object.freeze(result.evidence.confirmed.map(projectEvidence)),
    candidates: Object.freeze(result.evidence.candidates.map(projectEvidence)),
    nextActions: projectNextActions(result, request),
  });
}

/**
 * Serialize an agent view to compact JSON.
 */
export function serializeLocateAgentViewV2(
  result: LocateResultV2,
  request?: unknown,
): string {
  return JSON.stringify(projectLocateAgentViewV2(result, request));
}

/**
 * True when text JSON is the agent-view projection of the full result.
 */
export function agentViewMatchesResultV2(
  text: unknown,
  result: LocateResultV2,
  request?: unknown,
): boolean {
  const parsed = LocateAgentViewV2Schema.safeParse(text);
  if (!parsed.success) {
    return false;
  }
  return (
    JSON.stringify(parsed.data) ===
    JSON.stringify(projectLocateAgentViewV2(result, request))
  );
}
