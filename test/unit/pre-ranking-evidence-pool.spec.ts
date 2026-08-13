import { describe, expect, it } from 'vitest';

import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import {
  CandidateTokenProposalEnumeratorV2,
  readCandidateTokenProposalFactsV2,
} from '../../src/evidence/request-snapshot/candidate-token-proposal-enumerator-v2.js';
import { expandedOnlyReservedDoesNotSuppressLegacyV2 } from '../../src/evidence/request-snapshot/lane-candidate-evaluators-v2.js';
import { LegacyCandidateReservationV1 } from '../../src/evidence/request-snapshot/legacy-candidate-reservation-v1.js';
import {
  buildPreRankingStablePoolsV2,
  consumerViewLeaksPrivateStringsV2,
  toTrustedPreFinalEligibleViewsV2,
  toTrustedStableRecordViewsV2,
} from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createVerifiedCandidateContext } from '../../src/evidence/candidate-policy.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import { PRE_RANKING_POOL_SAFE_KEY_V2 } from '../../testkit/fixtures/request-snapshot-v2/pre-ranking-stable-pool-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'pre-ranking-stable-pool',
});

function makeRecord(
  discoveryKey: string,
  file: string,
  symbol: string,
): DiscoveryRecord {
  return Object.freeze({
    discoveryKey,
    location: Object.freeze({
      file,
      symbol,
      lines: Object.freeze([1, 1] as [number, number]),
      excerpt: symbol,
    }),
    discoveredBy: Object.freeze(['ripgrep' as const]),
    operations: Object.freeze(['RIPGREP_SEARCH' as const]),
    discoveryReasonCodes: Object.freeze(['LITERAL_TERM_HIT' as const]),
    matchedTerms: Object.freeze([{ value: symbol, caseSensitive: true }]),
    focusLines: Object.freeze([1, 1] as [number, number]),
    focusExcerpt: symbol,
    canonicalSymbols: Object.freeze([symbol]),
  });
}

describe.runIf(selected)('F3-POOL-001 pre-ranking-stable-pool', () => {
  it('keeps classification-undefined only in eligible pool and shares file buckets', () => {
    const keyA = 'server/a.ts' as CanonicalFileKeyV2;
    const draft = Object.freeze({
      evidenceClass: 'confirmed' as const,
      role: 'value-mapping' as const,
      location: Object.freeze({
        file: 'server/a.ts',
        lines: Object.freeze([1, 1] as [number, number]),
        excerpt: 'a',
      }),
      provenance: Object.freeze({
        discoveredBy: Object.freeze(['ripgrep' as const]),
        verifiedBy: 'filesystem' as const,
        operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
      }),
      reasonCodes: Object.freeze(['EXACT_TERM_MATCH' as const]),
    });
    const pools = buildPreRankingStablePoolsV2([
      Object.freeze({
        discoveryKey: 'd1',
        canonicalFileKey: keyA,
        safeKey: PRE_RANKING_POOL_SAFE_KEY_V2,
        draft,
        rankingSignals: Object.freeze({
          kind: 'direct' as const,
          focusLines: Object.freeze([1, 1] as [number, number]),
          focusExcerpt: 'a',
        }),
        classificationDefined: true,
      }),
      Object.freeze({
        discoveryKey: 'd2',
        canonicalFileKey: keyA,
        safeKey: `${PRE_RANKING_POOL_SAFE_KEY_V2}|other`,
        rankingSignals: Object.freeze({
          kind: 'derived' as const,
          focusLines: Object.freeze([2, 2] as [number, number]),
          focusExcerpt: 'b',
        }),
        classificationDefined: false,
      }),
    ]);

    expect(pools.eligible.records).toHaveLength(2);
    expect(pools.evidence.records).toHaveLength(1);
    expect(pools.evidence.records[0]?.discoveryKey).toBe('d1');
    expect(pools.eligible.records[0]?.fileBucketRef).toBe(
      pools.eligible.records[1]?.fileBucketRef,
    );

    const evidenceViews = toTrustedStableRecordViewsV2(pools.evidence);
    const eligibleViews = toTrustedPreFinalEligibleViewsV2(pools.eligible);
    expect(evidenceViews).toHaveLength(1);
    expect(eligibleViews).toHaveLength(2);
    expect(consumerViewLeaksPrivateStringsV2(evidenceViews[0]!)).toBe(false);
    expect(consumerViewLeaksPrivateStringsV2(eligibleViews[0]!)).toBe(false);
    expect(Object.keys(evidenceViews[0]!.recordRef)).toEqual([]);
    expect(Object.keys(eligibleViews[0]!.eligibleRef)).toEqual([]);
  });

  it('enumerates proposals once and keeps expanded-only reserved from suppressing legacy', () => {
    const enumerator = new CandidateTokenProposalEnumeratorV2();
    const context = createVerifiedCandidateContext(
      makeRecord('seed-1', 'server/x.ts', 'seedToken'),
      {
        file: 'server/x.ts',
        lines: [1, 1],
        excerpt: 'const seedToken = siblingToken;',
      },
    );
    const first = enumerator.enumerate(context);
    const second = enumerator.enumerate(context);
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]);

    const proposal = first.find(
      (token) =>
        readCandidateTokenProposalFactsV2(token).normalizedValue ===
        'siblingtoken',
    );
    expect(proposal).toBeDefined();

    const expandedOnly = [makeRecord('exp-1', 'server/x.ts', 'siblingToken')];
    const legacyOnly = [makeRecord('leg-1', 'server/x.ts', 'seedToken')];
    const divergence = expandedOnlyReservedDoesNotSuppressLegacyV2({
      proposal: proposal!,
      expandedRecords: expandedOnly,
      legacyRecords: legacyOnly,
    });
    expect(divergence.expandedReserved).toBe(true);
    expect(divergence.legacyReserved).toBe(false);

    const reservation = new LegacyCandidateReservationV1();
    const legacyRecords = reservation.filterLegacyRecords(
      [...expandedOnly, ...legacyOnly],
      new Set(['leg-1']),
    );
    expect(legacyRecords.map((record) => record.discoveryKey)).toEqual([
      'leg-1',
    ]);
  });

  it('treats safe-key collision groups atomically at the pre-ranking cap boundary', () => {
    const inputs = [];
    for (let index = 0; index < 3; index += 1) {
      inputs.push(
        Object.freeze({
          discoveryKey: `g-${index}`,
          canonicalFileKey: `f-${index}.ts` as CanonicalFileKeyV2,
          safeKey: 'same-safe-key',
          rankingSignals: Object.freeze({
            kind: 'derived' as const,
            focusLines: Object.freeze([1, 1] as [number, number]),
            focusExcerpt: 'x',
          }),
          classificationDefined: false,
        }),
      );
    }
    const pools = buildPreRankingStablePoolsV2(inputs);
    expect(pools.eligible.records).toHaveLength(3);
    expect(pools.evidence.preRankingPoolTruncated).toBe(false);
  });
});
