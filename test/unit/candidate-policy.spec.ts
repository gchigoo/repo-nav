import { describe, expect, it } from 'vitest';

import {
  type BackendHealth,
  type BackendHit,
  type BackendSearchRequest,
  type BackendSearchResult,
  CANDIDATE_REASON_CODES,
  createDiscoveryKey,
  type EvidenceLocation,
  type NormalizedSearchTerm,
  type RepositorySearchBackend,
  RepositoryAccessError,
} from '../../src/contracts/index.js';
import {
  applyCandidatePolicy,
  CANDIDATE_REASON_POLICY,
  createVerifiedCandidateContext,
  materializeCandidateDraft,
  promotionRequirementsForReasons,
  secondaryBackendCandidateReasons,
  type VerifiedCandidateContext,
} from '../../src/evidence/candidate-policy.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import { classifyDiscoveryRecords } from '../../src/evidence/direct-mapping-classifier.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import {
  CandidateFixtureBackend,
  candidateFixtureRoot,
} from '../../testkit/fixtures/candidate-policy/candidate-fixture-backend.js';
import { resolveRepositoryScopeV1 } from '../../src/evidence/scope/index.js';
import { CANDIDATE_CONTEXTS_V1 } from '../../testkit/fixtures/scope-v1/candidate-contexts-v1.js';
import { isSelected } from '../../testkit/testing/selection.js';

const POLICY_EXCERPT = [
  'function map(row: SourceRow) {',
  '  const sourceAlias = hcpId;',
  '  const unrelatedToken = row.other_value;',
  '  return {',
  '    hcpId: row.hcp_id,',
  '    hcpName: row.hcp_name,',
  '  };',
  '}',
].join('\n');

function term(value: string): NormalizedSearchTerm {
  return Object.freeze({ value, caseSensitive: true });
}

function record(
  excerpt = POLICY_EXCERPT,
  matchedTerms: readonly NormalizedSearchTerm[] = [term('hcpId')],
  file = 'server/candidate.ts',
): DiscoveryRecord {
  const location: EvidenceLocation = Object.freeze({
    file,
    lines: Object.freeze([1, excerpt.split('\n').length] as const),
    excerpt,
  });
  const lines = excerpt.split('\n');
  const focusIndex = lines.findIndex((line) =>
    matchedTerms.every((matchedTerm) => line.includes(matchedTerm.value)),
  );
  const focusLine = Math.max(1, focusIndex + 1);
  return Object.freeze({
    discoveryKey: createDiscoveryKey(location),
    location,
    discoveredBy: Object.freeze(['ripgrep'] as const),
    operations: Object.freeze([
      'RIPGREP_SEARCH',
      'FILESYSTEM_READ_RANGE',
    ] as const),
    discoveryReasonCodes: Object.freeze(['LITERAL_TERM_HIT'] as const),
    matchedTerms,
    focusLines: Object.freeze([focusLine, focusLine] as const),
    focusExcerpt: lines[focusIndex] ?? 'hcpId',
    canonicalSymbols: Object.freeze([]),
  });
}

function rangedRecord(
  file: string,
  linesRange: readonly [number, number],
  excerpt: string,
  matchedTerm: NormalizedSearchTerm,
): DiscoveryRecord {
  const location: EvidenceLocation = Object.freeze({
    file,
    lines: linesRange,
    excerpt,
  });
  const lines = excerpt.split('\n');
  const focusIndex = lines.findIndex((line) => line.includes(matchedTerm.value));
  const focusLine = linesRange[0] + focusIndex;
  return Object.freeze({
    discoveryKey: createDiscoveryKey(location),
    location,
    discoveredBy: Object.freeze(['ripgrep'] as const),
    operations: Object.freeze([
      'RIPGREP_SEARCH',
      'FILESYSTEM_READ_RANGE',
    ] as const),
    discoveryReasonCodes: Object.freeze(['LITERAL_TERM_HIT'] as const),
    matchedTerms: Object.freeze([matchedTerm]),
    focusLines: Object.freeze([focusLine, focusLine] as const),
    focusExcerpt: lines[focusIndex] ?? matchedTerm.value,
    canonicalSymbols: Object.freeze([]),
  });
}

function runPolicy(
  seed: DiscoveryRecord,
  maxCandidates = 20,
  contexts: readonly VerifiedCandidateContext[] = [
    createVerifiedCandidateContext(seed),
  ],
  signal: AbortSignal = new AbortController().signal,
) {
  return applyCandidatePolicy({
    records: [seed],
    contexts,
    maxCandidates,
    signal,
  });
}

function selected(group: string, caseId: string): boolean {
  return isSelected({ group, caseId });
}

class OrderedFixtureBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public constructor(private readonly hits: readonly BackendHit[]) {}

  public async probe(
    _repositoryRoot: string,
    _signal: AbortSignal,
  ): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return {
      health: { state: 'available' },
      hits: this.hits,
      complete: true,
    };
  }
}

function candidateSummary(result: ReturnType<typeof runPolicy>) {
  return result.candidates.map((candidate) => ({
    symbol: candidate.location.symbol,
    reasonCodes: candidate.reasonCodes,
  }));
}

describe.runIf(selected('candidate-truth-table', 'secondary-backend-provenance-table'))(
  'candidate truth table',
  () => {
    it('owns every schema reason and preserves exact promotion order', () => {
      expect(Object.keys(CANDIDATE_REASON_POLICY)).toEqual(
        CANDIDATE_REASON_CODES,
      );
      expect(CANDIDATE_REASON_POLICY).toEqual({
        EXACT_TERM_WITHOUT_DIRECT_MAPPING: {
          owner: 'F3',
          role: 'reference',
          promotionRequirements: [
            'USER_SEMANTIC_CONFIRMATION',
            'DIRECT_REFERENCE_REQUIRED',
          ],
        },
        SYMBOL_REFERENCE_ONLY: {
          owner: 'F3',
          role: 'reference',
          promotionRequirements: [
            'DIRECT_REFERENCE_REQUIRED',
            'CALL_PATH_REQUIRED',
          ],
        },
        SAME_SCOPE_SIMILAR_IDENTIFIER: {
          owner: 'F5',
          role: 'related',
          promotionRequirements: [
            'USER_SEMANTIC_CONFIRMATION',
            'DIRECT_REFERENCE_REQUIRED',
          ],
        },
        SAME_ENTITY_SIBLING: {
          owner: 'F5',
          role: 'related',
          promotionRequirements: [
            'USER_SEMANTIC_CONFIRMATION',
            'DIRECT_REFERENCE_REQUIRED',
          ],
        },
        ALIAS_SOURCE_NEIGHBOR: {
          owner: 'F5',
          role: 'related',
          promotionRequirements: [
            'USER_SEMANTIC_CONFIRMATION',
            'DIRECT_REFERENCE_REQUIRED',
          ],
        },
        SECONDARY_BACKEND_HIT: {
          owner: 'F6',
          role: 'related',
          promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
        },
      });
      expect(
        promotionRequirementsForReasons([
          'SYMBOL_REFERENCE_ONLY',
          'SAME_ENTITY_SIBLING',
        ]),
      ).toEqual([
        'USER_SEMANTIC_CONFIRMATION',
        'DIRECT_REFERENCE_REQUIRED',
        'CALL_PATH_REQUIRED',
      ]);
    });

    it('assigns secondary-only provenance only after a primary attempt', () => {
      expect(secondaryBackendCandidateReasons(['codegraph'], true)).toEqual([]);
      expect(secondaryBackendCandidateReasons(['ripgrep'], false)).toEqual([]);
      expect(
        secondaryBackendCandidateReasons(['codegraph', 'ripgrep'], true),
      ).toEqual([]);
      expect(
        secondaryBackendCandidateReasons(['filesystem', 'ripgrep'], true),
      ).toEqual([]);
      expect(
        secondaryBackendCandidateReasons(['ripgrep', 'filesystem'], true),
      ).toEqual([]);
      expect(secondaryBackendCandidateReasons(['ripgrep'], true)).toEqual([
        'SECONDARY_BACKEND_HIT',
      ]);
    });
  },
);

describe.runIf(selected('candidate-discovery', 'secondary-backend-provenance-table'))(
  'candidate lexical discovery',
  () => {
    it('finds bounded alias, entity sibling, and scope-similar identifiers', () => {
      const result = runPolicy(record());
      const bySymbol = new Map(
        result.candidates.map((candidate) => [
          candidate.location.symbol,
          candidate,
        ]),
      );

      expect(bySymbol.get('sourceAlias')).toMatchObject({
        role: 'related',
        reasonCodes: ['ALIAS_SOURCE_NEIGHBOR'],
        promotionRequirements: [
          'USER_SEMANTIC_CONFIRMATION',
          'DIRECT_REFERENCE_REQUIRED',
        ],
        provenance: {
          discoveredBy: ['filesystem'],
          verifiedBy: 'filesystem',
          operations: ['FILESYSTEM_FIND_MATCHES'],
        },
      });
      expect(bySymbol.get('hcpName')?.reasonCodes).toEqual([
        'SAME_SCOPE_SIMILAR_IDENTIFIER',
        'SAME_ENTITY_SIBLING',
      ]);
      expect(bySymbol.has('unrelatedToken')).toBe(false);
      expect(bySymbol.has('row')).toBe(false);

      for (const candidate of result.candidates) {
        expect(candidate.discoveryKey).not.toBe(candidate.seedDiscoveryKey);
        expect(candidate.location.lines[0]).toBe(candidate.location.lines[1]);
        expect(candidate.location.excerpt).toBe(candidate.location.symbol);
        expect(materializeCandidateDraft(candidate).id).toMatch(
          /^evidence:v1:[a-f0-9]{64}$/u,
        );
      }
    });

    it('fails closed across comments, strings, unrelated identifiers, and docs', () => {
      const decoy = record(
        [
          'function map() {',
          '  // hcpId = commentedAlias',
          "  const text = 'hcpId = stringAlias';",
          '  const pattern = /hcpId = regexAlias/;',
          '  const unrelatedName = otherValue;',
          '  return { hcpId: row.hcp_id };',
          '}',
        ].join('\n'),
      );
      const result = runPolicy(decoy);
      const symbols = result.candidates.map(
        (candidate) => candidate.location.symbol,
      );
      expect(symbols).not.toContain('commentedAlias');
      expect(symbols).not.toContain('stringAlias');
      expect(symbols).not.toContain('regexAlias');
      expect(symbols).not.toContain('unrelatedName');
      expect(
        runPolicy(record(POLICY_EXCERPT, [term('hcpId')], 'docs/example.ts'))
          .candidates,
      ).toEqual([]);
    });

    it.each([
      {
        label: 'class',
        excerpt: 'class Hcp {\n  hcpId: CustomId;\n  hcpName: CustomName;\n}',
        seed: 'hcpId',
        candidate: 'hcpName',
        expectedReasons: [
          'SAME_SCOPE_SIMILAR_IDENTIFIER',
          'SAME_ENTITY_SIBLING',
        ],
      },
      {
        label: 'interface',
        excerpt: 'interface Hcp {\n  hcpId: string;\n  hcpName: string;\n}',
        seed: 'hcpId',
        candidate: 'hcpName',
        expectedReasons: [
          'SAME_SCOPE_SIMILAR_IDENTIFIER',
          'SAME_ENTITY_SIBLING',
        ],
      },
      {
        label: 'generic type alias',
        excerpt: [
          'type Hcp = {',
          '  hcpId: EntityId<string>;',
          '  hcpName: EntityName<string>;',
          '};',
        ].join('\n'),
        seed: 'hcpId',
        candidate: 'hcpName',
        expectedReasons: [
          'SAME_SCOPE_SIMILAR_IDENTIFIER',
          'SAME_ENTITY_SIBLING',
        ],
      },
      {
        label: 'SQL table',
        excerpt: 'CREATE TABLE hcp (\n  hcp_id uuid,\n  hcp_name text\n);',
        seed: 'hcp_id',
        candidate: 'hcp_name',
        expectedReasons: ['SAME_ENTITY_SIBLING'],
      },
    ] as const)(
      'recognizes a balanced $label container',
      ({ excerpt, seed, candidate, expectedReasons }) => {
        const result = runPolicy(record(excerpt, [term(seed)]));
        expect(candidateSummary(result)).toEqual([
          { symbol: candidate, reasonCodes: expectedReasons },
        ]);
      },
    );

    it.each([
      {
        label: 'function parameter list',
        excerpt: 'function f(hcpId, callback) {\n  return hcpId;\n}',
        forbidden: 'callback',
      },
      {
        label: 'nested object',
        excerpt: [
          'const value = {',
          '  hcpId: source.id,',
          '  child: { hcpName: source.name },',
          '};',
        ].join('\n'),
        forbidden: 'hcpName',
      },
      {
        label: 'nested brace scope',
        excerpt: [
          'function f() {',
          '  const hcpId = source.id;',
          '  if (ready) { const hcpName = source.name; }',
          '}',
        ].join('\n'),
        forbidden: 'hcpName',
      },
      {
        label: 'unclosed outer delimiter',
        excerpt: [
          'function f() {',
          '  const value = {',
          '    hcpId: source.id,',
          '    child: { hcpName: source.name },',
          '  };',
        ].join('\n'),
        forbidden: 'hcpName',
      },
    ])('fails closed for $label boundaries', ({ excerpt, forbidden }) => {
      expect(
        runPolicy(record(excerpt)).candidates.some(
          (candidate) => candidate.location.symbol === forbidden,
        ),
      ).toBe(false);
    });

    it.each([
      {
        label: 'variable annotation',
        excerpt: 'function f() { const hcpId: HcpName = source; }',
        forbidden: 'HcpName',
      },
      {
        label: 'as assertion',
        excerpt: 'function f() { const value = hcpId as HcpName; }',
        forbidden: 'HcpName',
      },
      {
        label: 'satisfies inline type',
        excerpt: [
          'const value = source satisfies {',
          '  hcpId: CustomId;',
          '  hcpName: string;',
          '};',
        ].join('\n'),
        forbidden: 'CustomId',
      },
      {
        label: 'generic comma type',
        excerpt: [
          'interface Hcp {',
          '  hcpId: Record<string, CustomId>;',
          '  hcpName: string;',
          '}',
        ].join('\n'),
        forbidden: 'CustomId',
      },
      {
        label: 'tuple type',
        excerpt: [
          'type Hcp = {',
          '  hcpId: [Other, CustomId];',
          '  hcpName: string;',
          '};',
        ].join('\n'),
        forbidden: 'CustomId',
      },
      {
        label: 'function parameter type',
        excerpt: 'function f(hcpId: HcpName) { return hcpId; }',
        forbidden: 'HcpName',
      },
      {
        label: 'inline type literal',
        excerpt: [
          'const value: {',
          '  hcpId: CustomId;',
          '  hcpName: string;',
          '} = source;',
        ].join('\n'),
        forbidden: 'CustomId',
      },
    ])('does not classify $label tokens as candidates', ({ excerpt, forbidden }) => {
      const result = runPolicy(record(excerpt));
      expect(
        result.candidates.some(
          (candidate) => candidate.location.symbol === forbidden,
        ),
      ).toBe(false);
    });

    it.each([
      'function f() { const value = <HcpName>hcpId; }',
      'function f() { const value = factory<HcpName>(hcpId); }',
      'function f() { const value = factory<Record<string, HcpName>>(hcpId); }',
    ])('fails closed for angle-bracket type syntax: %s', (excerpt) => {
      expect(runPolicy(record(excerpt)).candidates).toEqual([]);
    });

    it('uses SQL-aware masking for AS aliases', () => {
      expect(
        candidateSummary(
          runPolicy(
            record(
              'SELECT hcpId AS hcpName;',
              [term('hcpId')],
              'db/mapping.sql',
            ),
          ),
        ),
      ).toEqual([
        { symbol: 'hcpName', reasonCodes: ['ALIAS_SOURCE_NEIGHBOR'] },
      ]);

      for (const excerpt of [
        '-- hcpId AS hcpName',
        "SELECT 'hcpId AS hcpName';",
        'SELECT "hcpId AS hcpName";',
        'SELECT $$ hcpId AS hcpName $$;',
        '/* outer /* inner */ hcpId AS hcpName */ SELECT 1;',
      ]) {
        expect(
          runPolicy(
            record(excerpt, [term('hcpId')], 'db/mapping.sql'),
          ).candidates,
        ).toEqual([]);
      }
    });

    it('fails scope and entity discovery closed for an unclosed array', () => {
      const result = runPolicy(
        record(
          'function f() { const values = [hcpId; const hcpName = 1; }',
        ),
      );
      expect(
        result.candidates.some(
          (candidate) => candidate.location.symbol === 'hcpName',
        ),
      ).toBe(false);
    });

    it('produces sibling candidates from the real single-line RipgrepBackend path', async () => {
      const engine = createCanonicalLocateEngineHarnessV2([new RipgrepBackend(new NodeSafeProcessRunner())],
        new NodeRepositoryReader(),
      ).service;
      const result = await engine.locate(
        {
          repoPath: candidateFixtureRoot,
          question: 'real ripgrep candidate window',
          terms: ['hcpId', 'row.hcp_id'],
          termCase: 'sensitive',
          layers: ['server'],
        },
        { signal: new AbortController().signal },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      expect(
        result.evidence.candidates.some(
          (candidate) =>
            candidate.location.file === 'server/mapping.fixture' &&
            candidate.location.symbol === 'hcpName' &&
            candidate.reasonCodes.includes('SAME_ENTITY_SIBLING'),
        ),
      ).toBe(true);
    });

    it('keeps confirmed identity unchanged when only the candidate window expands', async () => {
      class FocusOnlyReader extends NodeRepositoryReader {
        public override async readWindow(
          ...args: Parameters<NodeRepositoryReader['readWindow']>
        ): Promise<EvidenceLocation> {
          return await this.readRange(...args);
        }
      }
      const request = {
        repoPath: candidateFixtureRoot,
        question: 'candidate window identity',
        terms: ['hcpId', 'row.hcp_id'],
        termCase: 'sensitive' as const,
        layers: ['server'] as const,
      };
      const locate = async (reader: NodeRepositoryReader) =>
        await createCanonicalLocateEngineHarnessV2([new CandidateFixtureBackend()],
          reader,
        ).service.locate(request, { signal: new AbortController().signal });
      const expanded = await locate(new NodeRepositoryReader());
      const focusOnly = await locate(new FocusOnlyReader());

      expect(expanded.ok).toBe(true);
      expect(focusOnly.ok).toBe(true);
      if (!expanded.ok || !focusOnly.ok) {
        throw new Error('Candidate window identity fixture failed.');
      }
      expect(expanded.evidence.confirmed).toEqual(focusOnly.evidence.confirmed);
      expect(
        expanded.evidence.candidates.some(
          (candidate) => candidate.location.symbol === 'hcpName',
        ),
      ).toBe(true);
      expect(focusOnly.evidence.candidates).toEqual([]);
    });

    it('fails the request instead of hiding a second-read candidate context error', async () => {
      class FailingWindowReader extends NodeRepositoryReader {
        public override async readWindow(): Promise<never> {
          throw new RepositoryAccessError('FILE_UNREADABLE');
        }
      }
      const result = await createCanonicalLocateEngineHarnessV2([new CandidateFixtureBackend()],
        new FailingWindowReader(),
      ).service.locate(
        {
          repoPath: candidateFixtureRoot,
          question: 'candidate context failure',
          terms: ['hcpId', 'row.hcp_id'],
          termCase: 'sensitive',
          layers: ['server'],
        },
        { signal: new AbortController().signal },
      );

      expect(result).toMatchObject({
        ok: false,
        error: { code: 'INTERNAL_ERROR', recoverable: false },
      });
    });
  },
);

describe.runIf(selected('candidate-context', 'secondary-backend-provenance-table'))(
  'candidate verified context invariants',
  () => {
    it('rejects unknown, conflicting, and oversized contexts', () => {
      const seed = record();
      const valid = createVerifiedCandidateContext(seed);
      expect(() =>
        applyCandidatePolicy({
          records: [seed],
          contexts: [{ ...valid, seedDiscoveryKey: 'missing' }],
          maxCandidates: 1,
          signal: new AbortController().signal,
        }),
      ).toThrow(/unknown seed/u);
      expect(() =>
        applyCandidatePolicy({
          records: [seed],
          contexts: [valid, valid],
          maxCandidates: 1,
          signal: new AbortController().signal,
        }),
      ).toThrow(/conflict/u);
      expect(() =>
        applyCandidatePolicy({
          records: [seed],
          contexts: [
            {
              ...valid,
              lines: [1, 13],
              unredactedExcerpt: Array.from({ length: 13 }, () => 'hcpId')
                .join('\n'),
            },
          ],
          maxCandidates: 1,
          signal: new AbortController().signal,
        }),
      ).toThrow(/verified seed boundary/u);
    });

    it('accepts exactly 4 KiB and rejects 4 KiB plus one byte', () => {
      const prefix = 'function f(){hcpAlias=hcpId;}';
      const exactExcerpt = `${prefix}${' '.repeat(4 * 1024 - prefix.length)}`;
      const exactRecord = record(exactExcerpt);
      expect(runPolicy(exactRecord).candidates).toContainEqual(
        expect.objectContaining({
          location: expect.objectContaining({ symbol: 'hcpAlias' }),
        }),
      );

      const oversizedRecord = record(`${exactExcerpt} `);
      expect(() => runPolicy(oversizedRecord)).toThrow(
        /verified seed boundary/u,
      );
    });
  },
);

describe.runIf(
  selected('candidate-classification', 'discovery-key-mutual-exclusion'),
)(
  'candidate classification mutual exclusion',
  () => {
    it('keeps a confirmed seed out of candidate output before public IDs exist', () => {
      const excerpt = [
        'const sourceAlias = hcpId;',
        'hcpId = hcp_id;',
      ].join('\n');
      const seed = record(excerpt, [term('hcpId'), term('hcp_id')]);
      const classified = classifyDiscoveryRecords([seed], {
        anchors: [],
        layers: [],
        negativeTerms: [],
      });
      expect(classified.confirmed).toHaveLength(1);
      expect(classified.candidates).toEqual([]);

      const policy = runPolicy(seed);
      const confirmedKeys = new Set(
        classified.confirmed.map((evidence) =>
          createDiscoveryKey(evidence.location),
        ),
      );
      expect(confirmedKeys).toEqual(new Set([seed.discoveryKey]));
      expect(
        policy.candidates.some((candidate) =>
          confirmedKeys.has(candidate.discoveryKey),
        ),
      ).toBe(false);
      expect(policy.candidates.every((candidate) => candidate.role === 'related'))
        .toBe(true);
    });

    it('emits one confirmed evidence for an occurrence that also matches candidate terms', async () => {
      const matchedText = 'hcpId = hcp_id;';
      const engine = createCanonicalLocateEngineHarnessV2([
          new OrderedFixtureBackend([
            {
              file: 'server/exclusive.fixture',
              lines: [1, 1],
              matchedText,
              source: 'ripgrep',
              reasonCodes: ['LITERAL_TERM_HIT'],
            },
          ]),
        ],
        new NodeRepositoryReader(),
      ).service;
      const result = await engine.locate(
        {
          repoPath: candidateFixtureRoot,
          question: 'mutual exclusion',
          terms: ['hcpId', 'hcp_id'],
          termCase: 'sensitive',
          layers: ['server'],
        },
        { signal: new AbortController().signal },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      expect(result.evidence.confirmed).toHaveLength(1);
      expect(result.evidence.confirmed[0]?.role).toBe('value-mapping');
      expect(result.evidence.candidates).toEqual([]);
      expect(
        result.evidence.confirmed.length + result.evidence.candidates.length,
      ).toBe(1);
    });
  },
);

describe.runIf(selected('candidate-budget', 'candidate-budget'))(
  'candidate bounded selection',
  () => {
    it('reports zero and finite-capacity truncation without admitting late work', () => {
      const seed = record();
      expect(runPolicy(seed, 0)).toMatchObject({
        candidates: [],
        truncated: true,
      });
      const one = runPolicy(seed, 1);
      expect(one.candidates).toHaveLength(1);
      expect(one.truncated).toBe(true);

      const controller = new AbortController();
      controller.abort();
      expect(runPolicy(seed, 20, [createVerifiedCandidateContext(seed)], controller.signal))
        .toEqual({ candidates: [], truncated: false });
    });

    it.each([0, 1] as const)(
      'keeps confirmed evidence stable when maxCandidates is %i',
      async (maxCandidates) => {
        const engine = createCanonicalLocateEngineHarnessV2([new CandidateFixtureBackend()],
          new NodeRepositoryReader(),
        ).service;
        const result = await engine.locate(
          {
            repoPath: candidateFixtureRoot,
            question: 'candidate budget',
            terms: ['hcpId', 'row.hcp_id'],
            termCase: 'sensitive',
            layers: ['server'],
            limits: { maxCandidates },
          },
          { signal: new AbortController().signal },
        );
        expect(result).toMatchObject({
          ok: true,
          evidence: {
            status: 'partial',
            confirmed: [{ role: 'value-mapping' }],
            candidates:
              maxCandidates === 0
                ? []
                : [
                    {
                      location: { symbol: 'sourceAlias' },
                      reasonCodes: ['ALIAS_SOURCE_NEIGHBOR'],
                    },
                  ],
            coverage: { limitsReached: ['MAX_CANDIDATES_REACHED'] },
          },
        });
      },
    );
  },
);

describe.runIf(selected('candidate-permutation', 'candidate-permutation'))(
  'candidate deterministic selection',
  () => {
    it('is invariant to record and context permutations', () => {
      const first = record();
      const second = record(
        POLICY_EXCERPT.replaceAll('hcpId', 'hcpCode'),
        [term('hcpCode')],
        'server/second.ts',
      );
      const forward = applyCandidatePolicy({
        records: [first, second],
        contexts: [
          createVerifiedCandidateContext(first),
          createVerifiedCandidateContext(second),
        ],
        maxCandidates: 3,
        signal: new AbortController().signal,
      });
      const reversed = applyCandidatePolicy({
        records: [second, first],
        contexts: [
          createVerifiedCandidateContext(second),
          createVerifiedCandidateContext(first),
        ],
        maxCandidates: 3,
        signal: new AbortController().signal,
      });
      expect(reversed).toEqual(forward);
    });

    it('retains every reason when a selected candidate leaves and re-enters the bounded queue', () => {
      const file = 'server/reason-merge.ts';
      const completeExcerpt = [
        'function f() {',
        '  const hcpId = 1;',
        '  const hcpName = aliasSeed;',
        '  const zAlias = zSeed; }',
      ].join('\n');
      const scopeSeed = rangedRecord(
        file,
        [1, 4],
        completeExcerpt,
        term('hcpId'),
      );
      const interloperSeed = rangedRecord(
        file,
        [2, 4],
        completeExcerpt.split('\n').slice(1).join('\n'),
        term('zSeed'),
      );
      const aliasSeed = rangedRecord(
        file,
        [3, 3],
        '  const hcpName = aliasSeed;',
        term('aliasSeed'),
      );
      const records = [scopeSeed, interloperSeed, aliasSeed];
      const result = applyCandidatePolicy({
        records,
        contexts: records.map((candidate) =>
          createVerifiedCandidateContext(candidate),
        ),
        maxCandidates: 1,
        signal: new AbortController().signal,
      });

      expect(candidateSummary(result)).toEqual([
        {
          symbol: 'hcpName',
          reasonCodes: [
            'SAME_SCOPE_SIMILAR_IDENTIFIER',
            'ALIAS_SOURCE_NEIGHBOR',
          ],
        },
      ]);
      expect(result.truncated).toBe(true);
    });

    it('is invariant to backend hit order before maxFiles selection', async () => {
      const hits = [
        {
          file: 'server/alpha.fixture',
          lines: [1, 1] as const,
          matchedText: 'export const alpha = { hcpId: row.hcp_id };',
          source: 'ripgrep' as const,
          reasonCodes: ['LITERAL_TERM_HIT'] as const,
        },
        {
          file: 'server/zeta.fixture',
          lines: [1, 1] as const,
          matchedText: 'export const zeta = { hcpId: row.hcp_id };',
          source: 'ripgrep' as const,
          reasonCodes: ['LITERAL_TERM_HIT'] as const,
        },
      ] satisfies readonly BackendHit[];
      const locate = async (orderedHits: readonly BackendHit[]) =>
        await createCanonicalLocateEngineHarnessV2([new OrderedFixtureBackend(orderedHits)],
          new NodeRepositoryReader(),
        ).service.locate(
          {
            repoPath: candidateFixtureRoot,
            question: 'stable file budget',
            terms: ['hcpId', 'row.hcp_id'],
            termCase: 'sensitive',
            layers: ['server'],
            limits: { maxFiles: 1 },
          },
          { signal: new AbortController().signal },
        );

      const forward = await locate(hits);
      const reversed = await locate([...hits].reverse());
      expect(reversed).toEqual(forward);
      expect(forward).toMatchObject({
        ok: true,
        evidence: {
          confirmed: [{ location: { file: 'server/alpha.fixture' } }],
          coverage: { limitsReached: ['MAX_FILES_REACHED'] },
        },
      });
    });
  },
);

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'candidate-pool',
  }),
)('F7-CANDIDATE-001 candidate-pool', () => {
  it('excludes default test/docs neighbors and keeps explicit candidate-only', () => {
    const defaultScope = resolveRepositoryScopeV1([
      ...CANDIDATE_CONTEXTS_V1.defaultLayers,
    ]);
    expect(defaultScope.effective).not.toContain('test');
    expect(defaultScope.effective).not.toContain('docs');

    const explicit = resolveRepositoryScopeV1([
      ...CANDIDATE_CONTEXTS_V1.explicitTestDocs,
    ]);
    expect(explicit.effective).toEqual(['test', 'docs']);
    expect(
      classifyDiscoveryRecords(
        [
          {
            discoveryKey: createDiscoveryKey({
              file: CANDIDATE_CONTEXTS_V1.explicitCandidateNeighbor,
              lines: [1, 1],
              excerpt: 'targetField = row.source_field;',
            }),
            location: {
              file: CANDIDATE_CONTEXTS_V1.explicitCandidateNeighbor,
              lines: [1, 1],
              excerpt: 'targetField = row.source_field;',
            },
            discoveredBy: ['ripgrep'],
            operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
            discoveryReasonCodes: ['LITERAL_TERM_HIT'],
            matchedTerms: [
              { value: 'targetField', caseSensitive: false },
              { value: 'row.source_field', caseSensitive: false },
            ],
            focusLines: [1, 1],
            focusExcerpt: 'targetField = row.source_field;',
            canonicalSymbols: [],
          },
        ],
        {
          anchors: [],
          layers: ['test', 'docs'],
          negativeTerms: [],
        },
      ).confirmed,
    ).toEqual([]);
  });
});
