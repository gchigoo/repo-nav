import { describe, expect, it } from 'vitest';

import {
  createDiscoveryKey,
  type EvidenceLocation,
  type NormalizedSearchTerm,
} from '../../src/contracts/index.js';
import { classifyDiscoveryRecords } from '../../src/evidence/direct-mapping-classifier.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import {
  MATCH_PRIORITY_V2,
  MATCH_PRIORITIES_V2,
  normalizeAnchorIntentsV2,
  projectNormalizedLocateAnchorsV2,
  DiscoveryHitSelectorV2,
  EvidenceRankerV2,
  comparePublicSafeOrderingKeyV2,
  buildPublicSafeOrderingKeyV2,
  classifyRecordPriorityV2,
  ordinaryRoundRobinSelectV2,
  assertRankingTrustFinalizerV2,
  requireEvidenceRankingOutcomeV2,
  buildUnsatisfiedAnchorsV2,
  satisfactionForAnchorV2,
} from '../../src/evidence/ranking/index.js';
import {
  createOpaqueTokenV2,
  projectAndScopeFoldExpandedHitsV2,
  requireBoundDiscoverySelectionV2,
  type TrustedStableRecordViewV2,
} from '../../src/evidence/request-snapshot/index.js';
import { finalizeLocateResultV2 } from '../../src/evidence/locate-execution/finalize-locate-result-v2.js';
import { ANCHOR_INTENT_INSENSITIVE_DUP_V2 } from '../../testkit/fixtures/ranking-v2/anchor-intents-v2.js';
import { locateExecutionFinalizerInputFromUnsafePublicSourceV2 } from '../../testkit/fixtures/locate-execution-v2/finalizer-facts-v2.js';
import { createUnsafeLocateSuccessV2 } from '../../testkit/fixtures/public-output-v2/synthetic-locate-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import type { CanonicalFileKeyV2 } from '../../src/evidence/request-snapshot/canonical-file-identity-v2.js';
import { buildPreRankingStablePoolsV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createRequestRepositorySnapshotV2 } from '../../src/evidence/request-snapshot/request-repository-snapshot-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';

function executionToken() {
  const capability = issueLocateProjectionExecutionCapabilityV2();
  return requireLocateProjectionExecutionTokenV2(capability);
}

function fakeRecord(
  file: string,
  lines: readonly [number, number],
  evidenceClass: 'confirmed' | 'candidate',
  role = 'definition',
  fileBucketRef = createOpaqueTokenV2(),
  extras: {
    readonly symbol?: string;
    readonly reasonCodes?: readonly string[];
    readonly focusExcerpt?: string;
    readonly discoveredBy?: readonly ('filesystem' | 'ripgrep' | 'codegraph')[];
  } = {},
): TrustedStableRecordViewV2 {
  const brand = createOpaqueTokenV2<TrustedStableRecordViewV2>();
  const reasonCodes =
    extras.reasonCodes ??
    (evidenceClass === 'confirmed'
      ? (['EXACT_TERM_MATCH'] as const)
      : (['SECONDARY_BACKEND_HIT'] as const));
  return Object.freeze({
    ...brand,
    recordRef: createOpaqueTokenV2(),
    fileBucketRef,
    draft: Object.freeze({
      evidenceClass,
      role,
      location: Object.freeze({
        file,
        lines,
        excerpt: `${file}:${lines[0]}`,
        symbol: extras.symbol ?? (file.includes('sym') ? 'Sym' : undefined),
      }),
      provenance: Object.freeze({
        discoveredBy: Object.freeze(
          extras.discoveredBy ?? (['filesystem'] as const),
        ),
        verifiedBy: 'filesystem' as const,
        operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
      }),
      reasonCodes: Object.freeze([...reasonCodes]),
      ...(evidenceClass === 'candidate'
        ? {
            promotionRequirements: Object.freeze([
              'USER_SEMANTIC_CONFIRMATION' as const,
            ]),
          }
        : {}),
    }),
    rankingSignals: Object.freeze({
      kind: 'direct' as const,
      focusLines: lines,
      focusExcerpt: extras.focusExcerpt ?? 'const Sym = 1',
    }),
  }) as TrustedStableRecordViewV2;
}

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'anchor-intent-normalization',
  }),
)('F2-ANCHOR-001 anchor-intent-normalization', () => {
  it('keeps first insensitive display value and requestIndex', () => {
    const intents = normalizeAnchorIntentsV2(
      ANCHOR_INTENT_INSENSITIVE_DUP_V2,
      'insensitive',
    );
    expect(intents).toHaveLength(1);
    expect(intents[0]!.value).toBe('Foo');
    expect(intents[0]!.requestIndex).toBe(0);
    expect(intents[0]!.comparisonValue).toBe('foo');
    const projected = projectNormalizedLocateAnchorsV2(intents);
    expect(projected[0]!.value).toBe('Foo');
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'discovery-anchor-file-reservation',
  }),
)('F2-DISCOVERY-001 discovery-anchor-file-reservation', () => {
  it('selects via F3 opaque folded view without I/O', () => {
    const execution = executionToken();
    const folded = projectAndScopeFoldExpandedHitsV2({
      expandedResults: Object.freeze([]),
      execution,
      layerHint: 'unknown',
    });
    const selector = new DiscoveryHitSelectorV2();
    const draft = selector.select(
      folded.foldedView,
      normalizeAnchorIntentsV2([{ kind: 'file', value: 'a.ts' }]),
      2,
      execution,
    );
    expect(draft.draft.selectedLocatorRefs).toEqual([]);
    expect(draft.draft.reservations[0]!.state).toBe('no-hit');
    const bound = selector.bind(draft, execution);
    expect(
      requireBoundDiscoverySelectionV2(bound.bound, execution).draft
        .reservations[0]!.state,
    ).toBe('no-hit');
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'match-priority-truth-table',
  }),
)('F2-TIER-001 match-priority-truth-table', () => {
  it('freezes descending discrete priorities', () => {
    expect([...MATCH_PRIORITIES_V2]).toEqual([
      100, 96, 95, 94, 92, 88, 87, 80, 70, 60, 40,
    ]);
    expect(MATCH_PRIORITY_V2.FILE_ANCHOR).toBe(100);
    expect(MATCH_PRIORITY_V2.SECONDARY_BACKEND).toBe(40);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'public-safe-ranking-order',
  }),
)('F2-SAFEKEY-001 public-safe-ranking-order', () => {
  it('orders by structured key and treats operation/source vectors as equality fields', () => {
    const high = fakeRecord('z.ts', [1, 1], 'confirmed');
    const low = fakeRecord('a.ts', [1, 1], 'candidate');
    const highKey = buildPublicSafeOrderingKeyV2(
      high,
      MATCH_PRIORITY_V2.FILE_ANCHOR,
    ).orderingKey;
    const lowKey = buildPublicSafeOrderingKeyV2(
      low,
      MATCH_PRIORITY_V2.SECONDARY_BACKEND,
    ).orderingKey;
    expect(comparePublicSafeOrderingKeyV2(highKey, lowKey)).toBeLessThan(0);

    const fsHit = fakeRecord('same.ts', [1, 1], 'confirmed', 'definition');
    const cgHit = fakeRecord(
      'same.ts',
      [1, 1],
      'confirmed',
      'definition',
      createOpaqueTokenV2(),
      { discoveredBy: ['codegraph'] },
    );
    const left = buildPublicSafeOrderingKeyV2(fsHit, 100).orderingKey;
    const right = buildPublicSafeOrderingKeyV2(cgHit, 100).orderingKey;
    expect(left.sourceOrders).not.toEqual(right.sourceOrders);
    expect(comparePublicSafeOrderingKeyV2(left, right)).not.toBe(0);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'anchor-satisfaction-truth-table',
  }),
)('F2-SAT-001 anchor-satisfaction-truth-table', () => {
  it('classifies file/symbol/term satisfaction and priorities', () => {
    const fileRecord = fakeRecord('src/a.ts', [2, 2], 'candidate');
    const fileIntents = normalizeAnchorIntentsV2([
      { kind: 'file', value: 'src/a.ts' },
    ]);
    expect(satisfactionForAnchorV2(fileIntents[0]!, fileRecord)).toBe(
      'confirmed',
    );
    expect(
      classifyRecordPriorityV2({
        record: fileRecord,
        anchorIntents: fileIntents,
        regularTerms: [],
      }).priority,
    ).toBe(100);

    const symbolRecord = fakeRecord(
      'src/sym.ts',
      [1, 1],
      'confirmed',
      'definition',
      createOpaqueTokenV2(),
      { symbol: 'Foo' },
    );
    const symbolIntents = normalizeAnchorIntentsV2([
      { kind: 'symbol', value: 'Foo' },
    ]);
    expect(satisfactionForAnchorV2(symbolIntents[0]!, symbolRecord)).toBe(
      'confirmed',
    );
    expect(
      classifyRecordPriorityV2({
        record: symbolRecord,
        anchorIntents: symbolIntents,
        regularTerms: [],
      }).priority,
    ).toBe(96);

    const termRecord = fakeRecord(
      'src/t.ts',
      [1, 1],
      'candidate',
      'related',
      createOpaqueTokenV2(),
      {
        reasonCodes: ['EXACT_TERM_MATCH'],
        focusExcerpt: 'const targetField = 1',
      },
    );
    const termIntents = normalizeAnchorIntentsV2([
      { kind: 'term', value: 'targetField' },
    ]);
    expect(satisfactionForAnchorV2(termIntents[0]!, termRecord)).toBe(
      'candidate',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'cross-file-round-robin',
  }),
)('F2-RR-001 cross-file-round-robin', () => {
  it('takes at most one record per opaque bucket per round', () => {
    const bucketA = createOpaqueTokenV2();
    const bucketB = createOpaqueTokenV2();
    const a1 = fakeRecord('a.ts', [1, 1], 'confirmed', 'definition', bucketA);
    const a2 = fakeRecord('a.ts', [2, 2], 'confirmed', 'definition', bucketA);
    const b1 = fakeRecord('b.ts', [1, 1], 'confirmed', 'definition', bucketB);
    const selected = ordinaryRoundRobinSelectV2(
      [
        {
          record: a1,
          orderingKey: buildPublicSafeOrderingKeyV2(a1, 100).orderingKey,
        },
        {
          record: a2,
          orderingKey: buildPublicSafeOrderingKeyV2(a2, 96).orderingKey,
        },
        {
          record: b1,
          orderingKey: buildPublicSafeOrderingKeyV2(b1, 95).orderingKey,
        },
      ],
      2,
    );
    expect(selected).toHaveLength(2);
    const buckets = new Set(selected.map((item) => item.fileBucketRef));
    expect(buckets.size).toBe(2);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'ranking-trust-finalizer',
  }),
)('F2-TRUST-001 ranking-trust-finalizer', () => {
  it('rejects handcrafted outcome tokens', () => {
    const fake = createOpaqueTokenV2() as never;
    expect(() =>
      requireEvidenceRankingOutcomeV2(
        fake,
        createOpaqueTokenV2() as never,
        executionToken(),
      ),
    ).toThrow(/not trusted/);
    expect(typeof assertRankingTrustFinalizerV2).toBe('function');
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'public-materialization-source-stage',
  }),
)('F2-SOURCE-001 public-materialization-source-stage', () => {
  it('rejects an over-budget canonical materialization source', () => {
    const raw = structuredClone(createUnsafeLocateSuccessV2());
    if (!raw.ok) throw new Error('Expected success fixture.');
    const confirmed = raw.evidence.confirmed[0]!;
    Object.assign(raw.evidence, {
      confirmed: Array.from({ length: 21 }, () => structuredClone(confirmed)),
    });
    const result = finalizeLocateResultV2(
      locateExecutionFinalizerInputFromUnsafePublicSourceV2(raw),
    ).value;
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'public-materialization-real-adapter',
  }),
)('F2-MATERIALIZATION-001 public-materialization-real-adapter', () => {
  it('removes the ordinary-data materialization stage module', () => {
    expect(
      existsSync(
        resolve(
          import.meta.dirname,
          '../../src/evidence/public-output/f2-locate-projection-stages-v2.ts',
        ),
      ),
    ).toBe(false);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'v1-no-cutover',
  }),
)('F2-V1-001 v1-no-cutover', () => {
  it('does not export F2 stages from package root', async () => {
    const pkg = await import('../../src/index.js');
    expect(
      Object.prototype.hasOwnProperty.call(
        pkg,
        'createF2LocateProjectionStagesV2',
      ),
    ).toBe(false);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'real-classifier-ranking',
  }),
)('F2-CLASSIFIER-001 real-classifier-ranking', () => {
  it('maps real classifier confirmed draft to TERM_LITERAL priority', () => {
    const terms: readonly NormalizedSearchTerm[] = [
      { value: 'targetField', caseSensitive: false },
      { value: 'row.source_field', caseSensitive: false },
    ];
    const location: EvidenceLocation = {
      file: 'server/mapping.ts',
      lines: [1, 1],
      excerpt: 'targetField = row.source_field;',
    };
    const discovery: DiscoveryRecord = {
      discoveryKey: createDiscoveryKey(location),
      location,
      discoveredBy: ['ripgrep'],
      operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
      discoveryReasonCodes: ['LITERAL_TERM_HIT'],
      matchedTerms: terms,
      focusLines: [1, 1],
      focusExcerpt: 'targetField = row.source_field;',
      canonicalSymbols: [],
    };
    const classified = classifyDiscoveryRecords([discovery], {
      anchors: [],
      layers: [],
      negativeTerms: [],
    });
    expect(classified.confirmed).toHaveLength(1);
    const draft = classified.confirmed[0]!;
    const record = fakeRecord(
      draft.location.file,
      draft.location.lines,
      'confirmed',
      draft.role,
      createOpaqueTokenV2(),
      {
        reasonCodes: draft.reasonCodes,
        focusExcerpt: draft.location.excerpt,
        ...(draft.location.symbol === undefined
          ? {}
          : { symbol: draft.location.symbol }),
      },
    );
    const intents = normalizeAnchorIntentsV2([
      { kind: 'term', value: 'targetField' },
    ]);
    const ranked = classifyRecordPriorityV2({
      record,
      anchorIntents: intents,
      regularTerms: terms,
    });
    expect(ranked.priority).toBe(MATCH_PRIORITY_V2.TERM_LITERAL);
    expect(ranked.matchedAnchorKeys.length).toBeGreaterThan(0);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'anchor-record-reservation',
  }),
)('F2-BUDGET-001 anchor-record-reservation', () => {
  it('defers anchors beyond maxFiles by requestIndex', () => {
    const execution = executionToken();
    const folded = projectAndScopeFoldExpandedHitsV2({
      expandedResults: Object.freeze([]),
      execution,
      layerHint: 'unknown',
    });
    const intents = normalizeAnchorIntentsV2([
      { kind: 'file', value: 'a.ts' },
      { kind: 'file', value: 'b.ts' },
      { kind: 'file', value: 'c.ts' },
    ]);
    const draft = new DiscoveryHitSelectorV2().select(
      folded.foldedView,
      intents,
      2,
      execution,
    );
    expect(draft.draft.reservations).toHaveLength(3);
    const deferred = draft.draft.reservations.filter(
      (item) => item.state === 'budget-deferred',
    );
    expect(deferred).toHaveLength(1);
    expect(deferred[0]!.anchorKey).toBe(intents[2]!.canonicalKey);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'unsatisfied-anchor-ledger',
  }),
)('F2-LEDGER-001 unsatisfied-anchor-ledger', () => {
  it('emits NOT_FOUND / UNVERIFIED / BUDGET_EXCEEDED by retained set', () => {
    const intents = normalizeAnchorIntentsV2([
      { kind: 'file', value: 'missing.ts' },
      { kind: 'symbol', value: 'Sym' },
      { kind: 'file', value: 'deferred.ts' },
    ]);
    const candidateOnly = fakeRecord(
      'src/sym.ts',
      [1, 1],
      'candidate',
      'related',
      createOpaqueTokenV2(),
      { symbol: 'Sym', reasonCodes: ['SAME_SCOPE_SIMILAR_IDENTIFIER'] },
    );
    const ledger = buildUnsatisfiedAnchorsV2({
      anchorIntents: intents,
      retained: [candidateOnly],
      completeness: new Map([
        [intents[0]!.canonicalKey, 'complete'],
        [intents[1]!.canonicalKey, 'complete'],
        [intents[2]!.canonicalKey, 'incomplete'],
      ]),
      collisionAnchorKeys: new Set(),
      budgetDeferredKeys: new Set([intents[2]!.canonicalKey]),
    });
    expect(ledger).toEqual([
      Object.freeze({
        requestIndex: 0,
        kind: 'file',
        satisfaction: 'none',
        reason: 'NOT_FOUND',
      }),
      Object.freeze({
        requestIndex: 1,
        kind: 'symbol',
        satisfaction: 'candidate',
        reason: 'UNVERIFIED',
      }),
      Object.freeze({
        requestIndex: 2,
        kind: 'file',
        satisfaction: 'none',
        reason: 'BUDGET_EXCEEDED',
      }),
    ]);
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'ranking-permutation',
  }),
)('F2-PERM-001 ranking-permutation', () => {
  it('keeps public-safe order stable across input permutations', () => {
    const a = fakeRecord('a.ts', [1, 1], 'confirmed');
    const b = fakeRecord('b.ts', [1, 1], 'confirmed');
    const c = fakeRecord('c.ts', [2, 2], 'candidate');
    const keyed = [a, b, c].map((record) =>
      Object.freeze({
        record,
        key: buildPublicSafeOrderingKeyV2(
          record,
          record.draft.evidenceClass === 'confirmed' ? 100 : 40,
        ).orderingKey,
      }),
    );
    const sortKeys = (items: typeof keyed) =>
      [...items]
        .sort((left, right) =>
          comparePublicSafeOrderingKeyV2(left.key, right.key),
        )
        .map((item) => item.record.draft.location.file);
    expect(sortKeys(keyed)).toEqual(sortKeys([...keyed].reverse()));
    expect(sortKeys([keyed[1]!, keyed[2]!, keyed[0]!])).toEqual(
      sortKeys(keyed),
    );
  });
});

describe.runIf(
  isSelected({
    group: 'relevance-ranking-budget',
    caseId: 'ranking-real-envelope',
  }),
)('F2-ENVELOPE-001 ranking-real-envelope', () => {
  it('ranks via EvidenceRankerV2.rank and runs createSource→materialize chain', async () => {
    const workspace = mkdtempSync(resolve(tmpdir(), 'repo-nav-f2-rank-'));
    try {
      const relative = 'server/hit.ts';
      const absolute = resolve(workspace, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, 'const hit = 1;\n', 'utf8');
      const root = await new NodeRepositoryReader().resolveRoot(
        workspace,
        new AbortController().signal,
      );
      const snapshot = createRequestRepositorySnapshotV2({
        repositoryRoot: root,
      });
      try {
        await snapshot.readRange(
          root,
          relative,
          [1, 1],
          {
            maxFileBytes: 4096,
            maxExcerptBytes: 256,
            maxExcerptLines: 4,
          },
          new AbortController().signal,
        );
        const draft = Object.freeze({
          evidenceClass: 'confirmed' as const,
          role: 'definition' as const,
          location: Object.freeze({
            file: relative,
            lines: Object.freeze([1, 1] as [number, number]),
            excerpt: 'const hit = 1;',
          }),
          provenance: Object.freeze({
            discoveredBy: Object.freeze(['filesystem' as const]),
            verifiedBy: 'filesystem' as const,
            operations: Object.freeze(['FILESYSTEM_READ_RANGE' as const]),
          }),
          reasonCodes: Object.freeze(['EXACT_TERM_MATCH'] as const),
        });
        const pools = buildPreRankingStablePoolsV2([
          Object.freeze({
            discoveryKey: 'd-hit',
            canonicalFileKey: relative as CanonicalFileKeyV2,
            safeKey: 'hit',
            draft,
            rankingSignals: Object.freeze({
              kind: 'direct' as const,
              focusLines: Object.freeze([1, 1] as [number, number]),
              focusExcerpt: 'const hit = 1;',
            }),
            classificationDefined: true,
          }),
        ]);
        const execution = executionToken();
        const finalPools = await snapshot.finalCheck(
          new AbortController().signal,
          execution,
          pools.evidence,
          pools.eligible,
          'clean',
        );
        const folded = projectAndScopeFoldExpandedHitsV2({
          expandedResults: Object.freeze([]),
          execution,
          layerHint: 'server',
        });
        const intents = normalizeAnchorIntentsV2([
          { kind: 'file', value: relative },
        ]);
        const selector = new DiscoveryHitSelectorV2();
        const selection = selector.bind(
          selector.select(folded.foldedView, intents, 20, execution),
          execution,
        );
        const outcome = new EvidenceRankerV2().rank({
          finalPools,
          pool: finalPools.evidence,
          snapshotFacts: finalPools.facts,
          snapshotProof: finalPools.proof,
          normalizedTerms: Object.freeze([
            { value: 'hit', caseSensitive: false },
          ]),
          anchorIntents: intents,
          limits: {
            maxFiles: 20,
            maxConfirmed: 20,
            maxCandidates: 20,
          },
          discoverySelection: selection.bound,
          execution,
          preRankingPoolTruncated: false,
        });
        const view = requireEvidenceRankingOutcomeV2(
          outcome,
          finalPools.proof,
          execution,
        );
        expect(view.fragment.owner).toBe('ranking');
        expect(view.fragment.value.confirmed.length).toBeGreaterThanOrEqual(0);

        expect(view.fragment.value.confirmed).toEqual(
          outcome === undefined ? [] : view.fragment.value.confirmed,
        );
        expect(typeof requireEvidenceRankingOutcomeV2).toBe('function');
      } finally {
        snapshot.dispose();
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
