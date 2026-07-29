import { Buffer } from 'node:buffer';

import { z } from 'zod';

import {
  ANCHOR_KINDS,
  DEFAULT_LOCATE_LIMITS,
  LOCATE_LIMIT_MAXIMUMS,
  LOCATE_INPUT_MAX_BYTES,
  REPO_LAYERS,
  TERM_CASE_MODES,
} from './constants.js';
import {
  assertRawFileAnchorValueV2,
  assertRawRepoPathV2,
} from './v2/filesystem-input.js';
import {
  optionalQuestionSchemaV2,
  semanticNormalizedStringV2,
  semanticTermArrayV2,
} from './v2/semantic-input.js';

const utf8Length = (value: string): number => Buffer.byteLength(value, 'utf8');

/** @deprecated 语义字段请用 semanticNormalizedStringV2；保留兼容 export。 */
const normalizedString = semanticNormalizedStringV2;

const termArray = semanticTermArrayV2;

export const RepoLayerSchema = z.enum(REPO_LAYERS);
export type RepoLayer = z.infer<typeof RepoLayerSchema>;

export const AnchorKindSchema = z.enum(ANCHOR_KINDS);
export type AnchorKind = z.infer<typeof AnchorKindSchema>;

export const TermCaseModeSchema = z.enum(TERM_CASE_MODES);
export type TermCaseMode = z.infer<typeof TermCaseModeSchema>;

const rawRepoPathSchema = z.string().superRefine((value, context) => {
  try {
    assertRawRepoPathV2(value);
  } catch (error: unknown) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

const rawFileAnchorValueSchema = z.string().superRefine((value, context) => {
  try {
    assertRawFileAnchorValueV2(value);
  } catch (error: unknown) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : String(error),
      path: [],
    });
  }
});

export const LocateAnchorSchema = z
  .strictObject({
    kind: AnchorKindSchema,
    value: z.string().min(1),
  })
  .transform((anchor, context) => {
    if (anchor.kind === 'file') {
      const fileResult = rawFileAnchorValueSchema.safeParse(anchor.value);
      if (!fileResult.success) {
        context.addIssue({
          code: 'custom',
          message:
            fileResult.error.issues[0]?.message ??
            'File anchor must be repository-root relative.',
          path: ['value'],
        });
        return z.NEVER;
      }
      return Object.freeze({
        kind: 'file' as const,
        value: fileResult.data,
      });
    }
    const semantic = normalizedString('anchor value', 512).safeParse(
      anchor.value,
    );
    if (!semantic.success) {
      context.addIssue({
        code: 'custom',
        message:
          semantic.error.issues[0]?.message ?? 'anchor value is invalid.',
        path: ['value'],
      });
      return z.NEVER;
    }
    return Object.freeze({
      kind: anchor.kind,
      value: semantic.data,
    });
  });
export type LocateAnchor = z.infer<typeof LocateAnchorSchema>;

export const LocateLimitsSchema = z
  .strictObject({
    maxFiles: z.int().min(1).max(LOCATE_LIMIT_MAXIMUMS.maxFiles).optional(),
    maxConfirmed: z
      .int()
      .min(1)
      .max(LOCATE_LIMIT_MAXIMUMS.maxConfirmed)
      .optional(),
    maxCandidates: z
      .int()
      .min(0)
      .max(LOCATE_LIMIT_MAXIMUMS.maxCandidates)
      .optional(),
    timeoutMs: z
      .int()
      .min(1_000)
      .max(LOCATE_LIMIT_MAXIMUMS.timeoutMs)
      .optional(),
  })
  .readonly();
export type LocateLimits = z.infer<typeof LocateLimitsSchema>;

export interface ResolvedLocateLimits {
  readonly maxFiles: number;
  readonly maxConfirmed: number;
  readonly maxCandidates: number;
  readonly timeoutMs: number;
}

export const NormalizedSearchTermSchema = z
  .strictObject({
    value: z.string().min(1),
    caseSensitive: z.boolean(),
  })
  .readonly();
export type NormalizedSearchTerm = z.infer<typeof NormalizedSearchTermSchema>;

export const NormalizedLocateAnchorSchema = z
  .strictObject({
    kind: AnchorKindSchema,
    value: z.string().min(1),
    caseSensitive: z.boolean(),
  })
  .readonly();
export type NormalizedLocateAnchor = z.infer<
  typeof NormalizedLocateAnchorSchema
>;

/**
 * Locate request schema（filesystem / semantic 分离）。
 * 完整 raw guard 在 parseLocateRequestV2 入口执行；本 schema 仍含严格字段校验。
 */
export const LocateRequestSchema = z
  .strictObject({
    repoPath: rawRepoPathSchema,
    question: optionalQuestionSchemaV2,
    terms: termArray(1).readonly(),
    termCase: TermCaseModeSchema.optional(),
    anchors: z.array(LocateAnchorSchema).max(16).readonly().optional(),
    layers: z
      .array(RepoLayerSchema)
      .max(REPO_LAYERS.length)
      .readonly()
      .optional(),
    negativeTerms: termArray(0).readonly().optional(),
    limits: LocateLimitsSchema.optional(),
  })
  .readonly()
  .superRefine((request, context) => {
    // schema 层保留粗字节上限；精确 compact JSON 由 raw guard 负责
    if (utf8Length(JSON.stringify(request)) > LOCATE_INPUT_MAX_BYTES) {
      context.addIssue({
        code: 'custom',
        message: `Locate input exceeds ${LOCATE_INPUT_MAX_BYTES} UTF-8 bytes.`,
      });
    }
  });
export type LocateRequest = z.infer<typeof LocateRequestSchema>;

function isCaseSensitive(value: string, mode: TermCaseMode): boolean {
  if (mode === 'sensitive') {
    return true;
  }
  if (mode === 'insensitive') {
    return false;
  }
  return /\p{Lu}/u.test(value);
}

function comparisonKey(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLocaleLowerCase('und');
}

export function normalizeSearchTerms(
  terms: readonly string[],
  mode: TermCaseMode = 'smart',
): readonly NormalizedSearchTerm[] {
  const seen = new Set<string>();
  const normalized: NormalizedSearchTerm[] = [];

  for (const rawValue of terms) {
    const value = rawValue.normalize('NFKC').trim();
    const caseSensitive = isCaseSensitive(value, mode);
    const key = comparisonKey(value, caseSensitive);
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(Object.freeze({ value, caseSensitive }));
    }
  }

  return Object.freeze(normalized);
}

export function normalizeLocateAnchors(
  anchors: readonly LocateAnchor[],
  mode: TermCaseMode = 'smart',
): readonly NormalizedLocateAnchor[] {
  // F6：file anchor exact preserve；non-file 继续 NFKC/trim/smart-case
  const seen = new Set<string>();
  const normalized: NormalizedLocateAnchor[] = [];

  for (const anchor of anchors) {
    if (anchor.kind === 'file') {
      assertRawFileAnchorValueV2(anchor.value);
      const key = `file\u0000${anchor.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push(
          Object.freeze({
            kind: 'file',
            value: anchor.value,
            caseSensitive: true,
          }),
        );
      }
      continue;
    }
    const value = anchor.value.normalize('NFKC').trim();
    const caseSensitive = isCaseSensitive(value, mode);
    const comparison = caseSensitive ? value : value.toLocaleLowerCase('und');
    const key = `${anchor.kind}\u0000${comparison}`;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(
        Object.freeze({ kind: anchor.kind, value, caseSensitive }),
      );
    }
  }

  return Object.freeze(normalized);
}

export function resolveLocateLimits(
  limits?: LocateLimits,
): ResolvedLocateLimits {
  return Object.freeze({
    maxFiles: limits?.maxFiles ?? DEFAULT_LOCATE_LIMITS.maxFiles,
    maxConfirmed: limits?.maxConfirmed ?? DEFAULT_LOCATE_LIMITS.maxConfirmed,
    maxCandidates: limits?.maxCandidates ?? DEFAULT_LOCATE_LIMITS.maxCandidates,
    timeoutMs: limits?.timeoutMs ?? DEFAULT_LOCATE_LIMITS.timeoutMs,
  });
}

export type { SearchPlanInputV2 } from './v2/semantic-input.js';
