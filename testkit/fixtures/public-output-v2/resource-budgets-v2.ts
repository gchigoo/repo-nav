/**
 * F1B resource-budget fixtures: primitives, raw counts/fields, compact JSON.
 */

import { LOCATE_RESULT_RESOURCE_BUDGETS_V2 } from '../../../src/contracts/v2/locate-result-resource-budget-contract-v2.js';
import type { FinalizedUnsafeLocateResultV2 } from '../../../src/contracts/v2/locate-result-v2.js';
import { createUnsafeLocateSuccessV2 } from './synthetic-locate-v2.js';

export const F1B_BUDGETS = LOCATE_RESULT_RESOURCE_BUDGETS_V2;

export function utf8Repeat(char: string, bytes: number): string {
  const unit = Buffer.byteLength(char, 'utf8');
  if (unit === 0 || bytes % unit !== 0) {
    throw new Error(`utf8Repeat requires byte-aligned char length for ${char}`);
  }
  return char.repeat(bytes / unit);
}

export function createRawConfirmed(index: number): {
  readonly evidenceClass: 'confirmed';
  readonly role: 'value-mapping';
  readonly location: {
    readonly file: string;
    readonly symbol: string;
    readonly lines: readonly [number, number];
    readonly excerpt: string;
  };
  readonly provenance: {
    readonly discoveredBy: readonly ['filesystem'];
    readonly verifiedBy: 'filesystem';
    readonly operations: readonly ['FILESYSTEM_READ_RANGE'];
  };
  readonly reasonCodes: readonly ['DIRECT_ALIAS_MAPPING'];
} {
  return {
    evidenceClass: 'confirmed',
    role: 'value-mapping',
    location: {
      file: `src/mod-${String(index).padStart(2, '0')}.ts`,
      symbol: `symbol${String(index)}`,
      lines: [1, 1],
      excerpt: `const symbol${String(index)} = true;`,
    },
    provenance: {
      discoveredBy: ['filesystem'],
      verifiedBy: 'filesystem',
      operations: ['FILESYSTEM_READ_RANGE'],
    },
    reasonCodes: ['DIRECT_ALIAS_MAPPING'],
  };
}

export function withTerms(
  count: number,
  itemBytes: number,
): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      normalizedTerms: Array<{ value: string; caseSensitive: boolean }>;
    };
  };
  mutable.evidence.normalizedTerms = Array.from({ length: count }, () => ({
    value: utf8Repeat('t', itemBytes),
    caseSensitive: false,
  }));
  return raw;
}

export function withConfirmedCount(
  count: number,
  poisonAt?: number,
): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      confirmed: unknown[];
      coverage: { snapshot: { filesChecked: number } };
    };
  };
  const items: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    if (poisonAt === index) {
      const poison: Record<string, unknown> = {};
      Object.defineProperty(poison, 'location', {
        enumerable: true,
        get() {
          throw new Error('poison-element');
        },
      });
      items.push(poison);
    } else {
      items.push(createRawConfirmed(index));
    }
  }
  mutable.evidence.confirmed = items;
  mutable.evidence.coverage.snapshot.filesChecked = Math.max(count, 1);
  return raw;
}

export function withEvidenceTotal(
  confirmed: number,
  candidates: number,
): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      confirmed: unknown[];
      candidates: unknown[];
      coverage: { snapshot: { filesChecked: number } };
    };
  };
  mutable.evidence.confirmed = Array.from({ length: confirmed }, (_, i) =>
    createRawConfirmed(i),
  );
  mutable.evidence.candidates = Array.from({ length: candidates }, (_, i) => ({
    evidenceClass: 'candidate',
    role: 'related',
    location: {
      file: `src/cand-${String(i).padStart(2, '0')}.ts`,
      symbol: `cand${String(i)}`,
      lines: [1, 1],
      excerpt: `const cand${String(i)} = true;`,
    },
    provenance: {
      discoveredBy: ['filesystem'],
      verifiedBy: 'filesystem',
      operations: ['FILESYSTEM_READ_RANGE'],
    },
    reasonCodes: ['SAME_ENTITY_SIBLING'],
    promotionRequirements: ['USER_SEMANTIC_CONFIRMATION'],
  }));
  mutable.evidence.coverage.snapshot.filesChecked = confirmed + candidates;
  return raw;
}

export function withRawField(
  field: 'file' | 'symbol' | 'excerpt',
  value: string,
): FinalizedUnsafeLocateResultV2 {
  const raw = structuredClone(createUnsafeLocateSuccessV2());
  if (!raw.ok) throw new Error('expected success');
  const mutable = raw as unknown as {
    evidence: {
      confirmed: Array<{
        location: { file: string; symbol?: string; excerpt: string };
      }>;
    };
  };
  const location = mutable.evidence.confirmed[0]!.location;
  if (field === 'file') {
    location.file = value;
  } else if (field === 'symbol') {
    location.symbol = value;
  } else {
    location.excerpt = value;
  }
  return raw;
}

export function createPoisonConfirmedArray(length: number): unknown[] {
  const items: unknown[] = new Array(length);
  for (let index = 0; index < length; index += 1) {
    Object.defineProperty(items, String(index), {
      enumerable: true,
      configurable: true,
      get() {
        throw new Error('poison-element');
      },
    });
  }
  return items;
}

export const FIXED_INTERNAL_ERROR_V2 = Object.freeze({
  ok: false as const,
  error: Object.freeze({
    code: 'INTERNAL_ERROR' as const,
    message: 'Repository evidence request failed.',
    recoverable: false as const,
  }),
});
