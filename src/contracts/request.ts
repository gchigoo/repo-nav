import { Buffer } from 'node:buffer';
import { posix, win32 } from 'node:path';

import { z } from 'zod';

import {
  ANCHOR_KINDS,
  DEFAULT_LOCATE_LIMITS,
  LOCATE_LIMIT_MAXIMUMS,
  LOCATE_INPUT_MAX_BYTES,
  REPO_LAYERS,
  TERM_CASE_MODES,
} from './constants.js';

const utf8Length = (value: string): number => Buffer.byteLength(value, 'utf8');

const normalizedString = (
  label: string,
  maximumBytes: number,
) =>
  z
    .string()
    .transform((value) => value.normalize('NFKC').trim())
    .pipe(
      z
        .string()
        .min(1, `${label} must not be empty.`)
        .refine(
          (value) => utf8Length(value) <= maximumBytes,
          `${label} exceeds ${maximumBytes} UTF-8 bytes.`,
        ),
    );

const termArray = (minimumItems: number) =>
  z
    .array(normalizedString('search term', 128))
    .min(minimumItems)
    .max(16)
    .superRefine((terms, context) => {
      const totalBytes = terms.reduce(
        (total, term) => total + utf8Length(term),
        0,
      );
      if (totalBytes > 1024) {
        context.addIssue({
          code: 'custom',
          message: 'Search terms exceed 1024 UTF-8 bytes in total.',
        });
      }
    });

export const RepoLayerSchema = z.enum(REPO_LAYERS);
export type RepoLayer = z.infer<typeof RepoLayerSchema>;

export const AnchorKindSchema = z.enum(ANCHOR_KINDS);
export type AnchorKind = z.infer<typeof AnchorKindSchema>;

export const TermCaseModeSchema = z.enum(TERM_CASE_MODES);
export type TermCaseMode = z.infer<typeof TermCaseModeSchema>;

function normalizeFileAnchorValue(value: string): string {
  const slashValue = value.replaceAll('\\', '/');
  if (
    posix.isAbsolute(slashValue) ||
    win32.isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value)
  ) {
    throw new Error('File anchor must be repository-root relative.');
  }

  const normalized = posix.normalize(slashValue);
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new Error('File anchor escapes the repository root.');
  }
  return normalized;
}

export const LocateAnchorSchema = z
  .strictObject({
    kind: AnchorKindSchema,
    value: normalizedString('anchor value', 512),
  })
  .readonly()
  .superRefine((anchor, context) => {
    if (anchor.kind !== 'file') {
      return;
    }
    try {
      normalizeFileAnchorValue(anchor.value);
    } catch (error: unknown) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : String(error),
        path: ['value'],
      });
    }
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
export type NormalizedSearchTerm = z.infer<
  typeof NormalizedSearchTermSchema
>;

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

export const LocateRequestSchema = z
  .strictObject({
    repoPath: normalizedString('repoPath', 4096),
    question: normalizedString('question', 4096),
    terms: termArray(1).readonly(),
    termCase: TermCaseModeSchema.optional(),
    anchors: z.array(LocateAnchorSchema).max(16).readonly().optional(),
    layers: z.array(RepoLayerSchema).max(REPO_LAYERS.length).readonly().optional(),
    negativeTerms: termArray(0).readonly().optional(),
    limits: LocateLimitsSchema.optional(),
  })
  .readonly()
  .superRefine((request, context) => {
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
  const seen = new Set<string>();
  const normalized: NormalizedLocateAnchor[] = [];

  for (const anchor of anchors) {
    const literalValue = anchor.value.normalize('NFKC').trim();
    const value =
      anchor.kind === 'file'
        ? normalizeFileAnchorValue(literalValue)
        : literalValue;
    const caseSensitive =
      anchor.kind === 'file' ? true : isCaseSensitive(value, mode);
    const key = `${anchor.kind}\u0000${comparisonKey(value, caseSensitive)}`;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(
        Object.freeze({ kind: anchor.kind, value, caseSensitive }),
      );
    }
  }

  return Object.freeze(normalized);
}

export function resolveLocateLimits(limits?: LocateLimits): ResolvedLocateLimits {
  return Object.freeze({
    maxFiles: limits?.maxFiles ?? DEFAULT_LOCATE_LIMITS.maxFiles,
    maxConfirmed: limits?.maxConfirmed ?? DEFAULT_LOCATE_LIMITS.maxConfirmed,
    maxCandidates: limits?.maxCandidates ?? DEFAULT_LOCATE_LIMITS.maxCandidates,
    timeoutMs: limits?.timeoutMs ?? DEFAULT_LOCATE_LIMITS.timeoutMs,
  });
}
