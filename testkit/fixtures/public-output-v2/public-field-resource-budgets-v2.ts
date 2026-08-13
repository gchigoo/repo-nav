/**
 * F1B-PUBLIC-FIELD-001 / ORDINAL-001 fixtures.
 */

import type { FinalizedUnsafeLocateResultV2 } from '../../../src/contracts/v2/locate-result-v2.js';
import type { PublicFieldRedactionV2 } from '../../../src/evidence/public-output/sensitive-value-contract-v2.js';
import { createUnsafeLocateSuccessV2 } from './synthetic-locate-v2.js';
import { utf8Repeat } from './resource-budgets-v2.js';

export function redactionOf(bytes: number): PublicFieldRedactionV2 {
  return Object.freeze({
    value: utf8Repeat('p', bytes),
    reasonCodes: Object.freeze([] as const),
  });
}

/** Assembler-reachable: raw file/excerpt over public cap but under raw cap. */
export function withOversizedPublicFileAndExcerpt(): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      confirmed: Array<{
        location: { file: string; symbol?: string; excerpt: string };
      }>;
      candidates: Array<Record<string, unknown>>;
      coverage: { snapshot: { filesChecked: number } };
    };
  };
  mutable.evidence.confirmed[0]!.location.file = `a/${utf8Repeat('b', 2047)}`;
  mutable.evidence.confirmed[0]!.location.symbol = utf8Repeat('s', 100);
  mutable.evidence.confirmed[0]!.location.excerpt = utf8Repeat('e', 2049);
  mutable.evidence.candidates = [
    {
      evidenceClass: 'candidate',
      role: 'related',
      location: {
        file: 'src/second.ts',
        symbol: 'second',
        lines: [3, 4],
        excerpt: 'const second = 1;',
      },
      provenance: {
        discoveredBy: ['filesystem'],
        verifiedBy: 'filesystem',
        operations: ['FILESYSTEM_READ_RANGE'],
      },
      reasonCodes: ['SAME_ENTITY_SIBLING'],
      promotionRequirements: ['USER_SEMANTIC_CONFIRMATION'],
    },
  ];
  mutable.evidence.coverage.snapshot.filesChecked = 2;
  return raw;
}

export function withPublicFileBytes(
  bytes: number,
): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      confirmed: Array<{ location: { file: string } }>;
    };
  };
  mutable.evidence.confirmed[0]!.location.file = `a/${utf8Repeat('b', bytes - 2)}`;
  return raw;
}

export function withPublicExcerptBytes(
  bytes: number,
): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      confirmed: Array<{ location: { excerpt: string } }>;
    };
  };
  mutable.evidence.confirmed[0]!.location.excerpt = utf8Repeat('e', bytes);
  return raw;
}
