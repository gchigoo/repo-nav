import { describe, expect, it } from 'vitest';

import {
  ANCHOR_KINDS,
  BackendHealthSchema,
  CANDIDATE_REASON_CODES,
  CONFIRMED_REASON_CODES,
  EVIDENCE_CLASS_PRIORITY,
  EVIDENCE_ROLE_PRIORITY,
  EVIDENCE_SCHEMA_VERSION,
  EvidencePackSchema,
  LocateRequestSchema,
  LOCATE_STATUSES,
  NEXT_ACTION_CODES,
  normalizeLocateAnchors,
  normalizeSearchTerms,
  comparePublicEvidence,
  createDiscoveryKey,
  createEvidenceId,
  selectPrimaryEvidenceRole,
  type EvidenceRole,
  type PublicEvidence,
} from '../../src/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = { group: 'contract', caseId: 'term-case-parity' } as const;

const validRequest = {
  repoPath: ' C:\\code ',
  question: ' Where is the mapping? ',
  terms: ['hcp_id'],
} as const;

interface EvidenceOptions {
  readonly evidenceClass?: PublicEvidence['evidenceClass'];
  readonly role?: EvidenceRole;
  readonly file?: string;
  readonly lines?: readonly [number, number];
  readonly idSuffix?: string;
}

function createComparableEvidence(
  options: EvidenceOptions = {},
): PublicEvidence {
  const evidenceClass = options.evidenceClass ?? 'confirmed';
  const common = {
    id: `evidence:v1:${options.idSuffix ?? '0'.repeat(64)}`,
    role: options.role ?? 'value-mapping',
    location: {
      file: options.file ?? 'src/a.ts',
      lines: options.lines ?? ([1, 1] as const),
      excerpt: 'return row.hcp_id;',
    },
    provenance: {
      discoveredBy: ['ripgrep'] as const,
      verifiedBy: 'filesystem' as const,
      operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'] as const,
    },
  } as const;

  return evidenceClass === 'confirmed'
    ? {
        ...common,
        evidenceClass,
        reasonCodes: ['DIRECT_ALIAS_MAPPING'],
      }
    : {
        ...common,
        evidenceClass,
        reasonCodes: ['SAME_ENTITY_SIBLING'],
        promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
      };
}

describe.runIf(isSelected(identity))('schema v1 contracts', () => {
  it('normalizes NFKC and applies smart case independently per term', () => {
    const parsed = LocateRequestSchema.parse({
      ...validRequest,
      terms: ['ｈｃｐ＿ｉｄ', 'HcpId', 'hcp_id', '[literal].'],
    });

    // F6：repoPath exact preserve（含首尾空格），不再 NFKC/trim
    expect(parsed.repoPath).toBe(' C:\\code ');
    expect(
      normalizeSearchTerms(parsed.terms, parsed.termCase ?? 'smart'),
    ).toEqual([
      { value: 'hcp_id', caseSensitive: false },
      { value: 'HcpId', caseSensitive: true },
      { value: '[literal].', caseSensitive: false },
    ]);
  });

  it('preserves legal file anchors exactly and keeps non-file literals', () => {
    const anchors = LocateRequestSchema.parse({
      ...validRequest,
      anchors: [
        { kind: 'file', value: 'src/folder/Mapping.ts' },
        { kind: 'symbol', value: 'map\\Hcp' },
      ],
    }).anchors;

    expect(normalizeLocateAnchors(anchors ?? [])).toEqual([
      {
        kind: 'file',
        value: 'src/folder/Mapping.ts',
        caseSensitive: true,
      },
      { kind: 'symbol', value: 'map\\Hcp', caseSensitive: true },
    ]);
  });

  it.each([
    '../x.ts',
    '/abs.ts',
    'C:\\abs.ts',
    '\\\\server\\share\\x.ts',
    'src\\folder/Mapping.ts',
    'src/folder/../Other.ts',
    'src//folder/Mapping.ts',
  ])('rejects illegal file anchor %s', (value) => {
    expect(
      LocateRequestSchema.safeParse({
        ...validRequest,
        anchors: [{ kind: 'file', value }],
      }).success,
    ).toBe(false);
    expect(() => normalizeLocateAnchors([{ kind: 'file', value }])).toThrow();
  });

  it('enforces item, aggregate, field, range, and strict-object budgets', () => {
    expect(
      LocateRequestSchema.safeParse({ ...validRequest, terms: [] }).success,
    ).toBe(false);
    expect(
      LocateRequestSchema.safeParse({
        ...validRequest,
        terms: Array.from({ length: 9 }, () => '界'.repeat(43)),
      }).success,
    ).toBe(false);
    expect(
      LocateRequestSchema.safeParse({
        ...validRequest,
        terms: ['x'.repeat(129)],
      }).success,
    ).toBe(false);
    expect(
      LocateRequestSchema.safeParse({
        ...validRequest,
        limits: { timeoutMs: 999 },
      }).success,
    ).toBe(false);
    expect(
      LocateRequestSchema.safeParse({ ...validRequest, regex: '.*' }).success,
    ).toBe(false);
  });

  it('locks every schema v1 enum and priority table', () => {
    expect(EVIDENCE_SCHEMA_VERSION).toBe('1.0');
    expect(ANCHOR_KINDS).toEqual(['symbol', 'file', 'table', 'route', 'term']);
    expect(LOCATE_STATUSES).toEqual([
      'ok',
      'partial',
      'no_result',
      'backend_unavailable',
      'timeout',
    ]);
    expect(CONFIRMED_REASON_CODES).toHaveLength(3);
    expect(CANDIDATE_REASON_CODES).toHaveLength(6);
    expect(NEXT_ACTION_CODES).toHaveLength(5);
    expect(EVIDENCE_CLASS_PRIORITY).toEqual({ confirmed: 0, candidate: 1 });
    expect(EVIDENCE_ROLE_PRIORITY).toEqual({
      'value-mapping': 0,
      'execution-site': 1,
      definition: 2,
      reference: 3,
      related: 4,
    });
  });

  it('preserves backend stale-index and reason metadata in the strict schema', () => {
    expect(
      BackendHealthSchema.parse({
        state: 'available',
        version: '1.1.6',
        indexFound: true,
        possibleStaleIndex: true,
        reasonCode: 'CODEGRAPH_INDEX_MISSING',
      }),
    ).toMatchObject({
      possibleStaleIndex: true,
      reasonCode: 'CODEGRAPH_INDEX_MISSING',
    });
    expect(
      BackendHealthSchema.safeParse({
        state: 'available',
        reasonCode: 'UNKNOWN',
      }).success,
    ).toBe(false);
  });

  it('creates stable IDs from normalized relative locations and role priority', () => {
    const windowsKey = createDiscoveryKey({
      file: 'src\\mapping.ts',
      lines: [10, 12],
      excerpt: 'a\r\nb',
    });
    const posixKey = createDiscoveryKey({
      file: 'src/mapping.ts',
      lines: [10, 12],
      excerpt: 'a\nb',
    });
    const id = createEvidenceId(windowsKey, 'confirmed', 'value-mapping');

    expect(windowsKey).toBe(posixKey);
    expect(id).toMatch(/^evidence:v1:[a-f0-9]{64}$/u);
    expect(
      selectPrimaryEvidenceRole(['related', 'definition', 'value-mapping']),
    ).toBe('value-mapping');
  });

  it('sorts by every schema v1 key with deterministic antisymmetry', () => {
    const orderedPairs = [
      [
        createComparableEvidence({ evidenceClass: 'confirmed' }),
        createComparableEvidence({ evidenceClass: 'candidate' }),
      ],
      [
        createComparableEvidence({ role: 'value-mapping' }),
        createComparableEvidence({ role: 'execution-site' }),
      ],
      [
        createComparableEvidence({ file: 'src/A.ts' }),
        createComparableEvidence({ file: 'src/a.ts' }),
      ],
      [
        createComparableEvidence({ lines: [1, 9] }),
        createComparableEvidence({ lines: [2, 2] }),
      ],
      [
        createComparableEvidence({ lines: [1, 1] }),
        createComparableEvidence({ lines: [1, 2] }),
      ],
      [
        createComparableEvidence({ idSuffix: '0'.repeat(64) }),
        createComparableEvidence({ idSuffix: `${'0'.repeat(63)}1` }),
      ],
    ] as const;

    for (const [left, right] of orderedPairs) {
      expect(comparePublicEvidence(left, right)).toBeLessThan(0);
      expect(comparePublicEvidence(right, left)).toBeGreaterThan(0);
      expect(Math.sign(comparePublicEvidence(left, right))).toBe(
        -Math.sign(comparePublicEvidence(right, left)),
      );
    }
    const same = createComparableEvidence();
    expect(comparePublicEvidence(same, same)).toBe(0);
  });

  it('rejects EvidencePack IDs that appear in both evidence classes', () => {
    const id = `evidence:v1:${'a'.repeat(64)}`;
    const location = {
      file: 'src/mapping.ts',
      lines: [1, 1],
      excerpt: 'const hcp = row.hcp_id;',
    } as const;
    const provenance = {
      discoveredBy: ['ripgrep'],
      verifiedBy: 'filesystem',
      operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    } as const;
    const result = EvidencePackSchema.safeParse({
      schemaVersion: '1.0',
      status: 'ok',
      repositoryRoot: 'C:/code',
      normalizedTerms: [{ value: 'hcp_id', caseSensitive: false }],
      confirmed: [
        {
          evidenceClass: 'confirmed',
          id,
          role: 'value-mapping',
          location,
          provenance,
          reasonCodes: ['DIRECT_ALIAS_MAPPING'],
        },
      ],
      candidates: [
        {
          evidenceClass: 'candidate',
          id,
          role: 'related',
          location,
          provenance,
          reasonCodes: ['SAME_ENTITY_SIBLING'],
          promotionRequirements: ['DIRECT_REFERENCE_REQUIRED'],
        },
      ],
      coverage: {
        backends: [],
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'unknown',
        limitsReached: [],
        exclusionSummary: {},
      },
      nextActions: ['CONFIRM_CANDIDATE'],
    });

    expect(result.success).toBe(false);
  });
});
