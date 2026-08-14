/**
 * F1B-LEGACY-ISOLATION-001: v2 shadow failures must not mutate production v1 engine results.
 */

import {
  utf8Repeat,
  createPoisonConfirmedArray,
} from './resource-budgets-v2.js';
import { createUnsafeLocateSuccessV2 } from './synthetic-locate-v2.js';

export function v2ShadowFailureInputs(): readonly unknown[] {
  const oversizedExcerpt = structuredClone(
    createUnsafeLocateSuccessV2(),
  ) as unknown as {
    evidence: { confirmed: Array<{ location: { excerpt: string } }> };
  };
  oversizedExcerpt.evidence.confirmed[0]!.location.excerpt = utf8Repeat(
    'e',
    16_385,
  );

  const oversizedFile = structuredClone(
    createUnsafeLocateSuccessV2(),
  ) as unknown as {
    evidence: { confirmed: Array<{ location: { file: string } }> };
  };
  oversizedFile.evidence.confirmed[0]!.location.file = `a/${utf8Repeat('b', 4095)}`;

  const base = createUnsafeLocateSuccessV2();
  if (!base.ok) throw new Error('expected success');

  return [
    {
      ok: true,
      evidence: {
        ...base.evidence,
        confirmed: createPoisonConfirmedArray(21),
      },
    },
    oversizedExcerpt,
    oversizedFile,
    { ok: true, evidence: null },
  ];
}
