/**
 * F1B-PROJECTION-001: failure-stage inputs for synthetic projection forbidden scan.
 */

import { createPoisonConfirmedArray } from './resource-budgets-v2.js';
import { createUnsafeLocateSuccessV2 } from './synthetic-locate-v2.js';

export const FORBIDDEN_BUDGET_DETAIL_MARKERS = Object.freeze([
  'raw-shape',
  'raw-field',
  'raw-json',
  'corpus',
  'public-field',
  'public-json',
  '4194304',
  '1048576',
  '32768',
  'poison-element',
  'x '.repeat(100),
] as const);

export function failureInputsByStage(): Readonly<Record<string, unknown>> {
  const oversizedExcerpt = structuredClone(
    createUnsafeLocateSuccessV2(),
  ) as unknown as {
    evidence: { confirmed: Array<{ location: { excerpt: string } }> };
  };
  oversizedExcerpt.evidence.confirmed[0]!.location.excerpt = 'x '.repeat(
    200_000,
  );

  const base = createUnsafeLocateSuccessV2();
  if (!base.ok) throw new Error('expected success');

  return {
    'raw-shape': {
      ok: true,
      evidence: {
        ...base.evidence,
        confirmed: createPoisonConfirmedArray(21),
      },
    },
    'raw-field': oversizedExcerpt,
    'raw-json': { ok: true, evidence: { nested: undefined } },
  };
}
