import { Buffer } from 'node:buffer';

import { z } from 'zod';

import { ANCHOR_KINDS, REPO_LAYERS, TERM_CASE_MODES } from '../constants.js';

/**
 * F6 semantic input：question / terms / non-file anchors 走 NFKC+trim。
 */

const utf8Length = (value: string): number => Buffer.byteLength(value, 'utf8');

export const semanticNormalizedStringV2 = (
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

export const optionalQuestionSchemaV2 = semanticNormalizedStringV2(
  'question',
  4096,
).optional();

export const semanticTermArrayV2 = (minimumItems: number) =>
  z
    .array(semanticNormalizedStringV2('search term', 128))
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

export const SemanticRepoLayerSchemaV2 = z.enum(REPO_LAYERS);
export const SemanticAnchorKindSchemaV2 = z.enum(ANCHOR_KINDS);
export const SemanticTermCaseModeSchemaV2 = z.enum(TERM_CASE_MODES);

/**
 * SearchPlan 输入不含 question/displayIntent；仅供类型边界证明。
 */
export interface SearchPlanInputV2 {
  readonly repoPath: string;
  readonly terms: readonly string[];
  readonly termCase?: (typeof TERM_CASE_MODES)[number];
  readonly anchors?: readonly Readonly<{
    kind: (typeof ANCHOR_KINDS)[number];
    value: string;
  }>[];
  readonly layers?: readonly (typeof REPO_LAYERS)[number][];
  readonly negativeTerms?: readonly string[];
}
