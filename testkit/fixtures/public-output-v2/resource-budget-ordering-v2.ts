/**
 * F1B-ORDERING-001: poison-tail, accessor descriptor gate, Proxy, key permutation.
 */

import { createUnsafeLocateSuccessV2 } from './synthetic-locate-v2.js';
import { createPoisonConfirmedArray } from './resource-budgets-v2.js';

export function sourceWithPoisonConfirmedTail(
  length: number,
): Record<string, unknown> {
  const base = structuredClone(createUnsafeLocateSuccessV2()) as Record<
    string,
    unknown
  >;
  const evidence = structuredClone(
    (base as { evidence: Record<string, unknown> }).evidence,
  );
  evidence['confirmed'] = createPoisonConfirmedArray(length);
  (
    evidence['coverage'] as { snapshot: { filesChecked: number } }
  ).snapshot.filesChecked = length;
  return { ok: true, evidence };
}

export function sourceWithAccessorFileField(): Record<string, unknown> {
  const base = structuredClone(createUnsafeLocateSuccessV2());
  if (!base.ok) throw new Error('expected success');
  const location: Record<string, unknown> = {
    symbol: base.evidence.confirmed[0]!.location.symbol,
    lines: base.evidence.confirmed[0]!.location.lines,
    excerpt: base.evidence.confirmed[0]!.location.excerpt,
  };
  let getterCalls = 0;
  Object.defineProperty(location, 'file', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      throw new Error(`accessor-file-${String(getterCalls)}`);
    },
  });
  const evidence = {
    ...base.evidence,
    confirmed: [
      {
        ...base.evidence.confirmed[0],
        location,
      },
    ],
  };
  return { ok: true, evidence, __getterCalls: () => getterCalls };
}

export function throwingProxySource(): unknown {
  return new Proxy(
    { ok: true },
    {
      get() {
        throw new Error('proxy-trap');
      },
      ownKeys() {
        throw new Error('proxy-ownKeys');
      },
      getOwnPropertyDescriptor() {
        throw new Error('proxy-descriptor');
      },
    },
  );
}

export function keyPermutedEquivalentSource(): readonly [
  Record<string, unknown>,
  Record<string, unknown>,
] {
  const a = {
    ok: true,
    evidence: {
      normalizedTerms: [{ value: 'mapping', caseSensitive: false }],
      confirmed: [],
      candidates: [],
      coverage: {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: 0,
          },
        ],
        strategyComplete: true,
        fallbackChecked: true,
        indexState: 'available',
        indexFreshness: 'not-applicable',
        limitsReached: [],
        degradations: [],
        exclusionSummary: {},
        abortSource: 'none',
        unsatisfiedAnchors: [],
        snapshot: {
          gitState: 'clean',
          consistency: 'stable',
          filesChecked: 0,
          discardedEvidenceCount: 0,
        },
        scope: {
          requested: [],
          effective: ['client', 'server', 'db', 'config', 'unknown'],
          policyVersion: 'repo-scope-v1',
          unmatchedLayers: [],
        },
        capabilities: {
          textSearch: 'supported-text-files',
          semanticClassification: ['typescript', 'javascript', 'sql'],
          unsupportedLanguageHits: 0,
        },
      },
      nextActions: [],
    },
  };
  const b = {
    evidence: a.evidence,
    ok: true,
  };
  return [a, b];
}
