import {
  LocateResultSchema,
  type LocateResult,
} from '../../src/contracts/index.js';

export interface EvidencePackFieldMutation {
  readonly path: string;
  readonly replacement: unknown;
  readonly normalized: boolean;
}

export const PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS = Object.freeze([
  { path: 'evidence.schemaVersion', replacement: '2.0', normalized: false },
  { path: 'evidence.status', replacement: 'partial', normalized: false },
  {
    path: 'evidence.repositoryRoot',
    replacement: 'D:/another-fixture',
    normalized: true,
  },
  { path: 'evidence.normalizedTerms', replacement: [], normalized: false },
  {
    path: 'evidence.normalizedTerms.0.value',
    replacement: 'other',
    normalized: false,
  },
  {
    path: 'evidence.normalizedTerms.0.caseSensitive',
    replacement: true,
    normalized: false,
  },
  { path: 'evidence.confirmed', replacement: [], normalized: false },
  {
    path: 'evidence.confirmed.0.evidenceClass',
    replacement: 'candidate',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.id',
    replacement: `evidence:v1:${'c'.repeat(64)}`,
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.role',
    replacement: 'definition',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.file',
    replacement: 'server/other.ts',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.symbol',
    replacement: 'OtherSymbol',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.lines',
    replacement: [2, 2],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.excerpt',
    replacement: 'const other = source.other;',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.redaction.applied',
    replacement: false,
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.location.redaction.reasonCodes',
    replacement: ['PERSONAL_DATA'],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.provenance.discoveredBy',
    replacement: ['codegraph'],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.provenance.verifiedBy',
    replacement: 'backend',
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.provenance.operations',
    replacement: ['CODEGRAPH_QUERY', 'FILESYSTEM_READ_RANGE'],
    normalized: false,
  },
  {
    path: 'evidence.confirmed.0.reasonCodes',
    replacement: ['EXACT_SYMBOL_ANCHOR'],
    normalized: false,
  },
  { path: 'evidence.candidates', replacement: [], normalized: false },
  {
    path: 'evidence.candidates.0.evidenceClass',
    replacement: 'confirmed',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.id',
    replacement: `evidence:v1:${'d'.repeat(64)}`,
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.role',
    replacement: 'reference',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.location.file',
    replacement: 'server/other-candidate.ts',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.location.lines',
    replacement: [4, 4],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.location.excerpt',
    replacement: 'otherCandidate',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.provenance.discoveredBy',
    replacement: ['ripgrep'],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.provenance.verifiedBy',
    replacement: 'backend',
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.provenance.operations',
    replacement: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.reasonCodes',
    replacement: ['SYMBOL_REFERENCE_ONLY'],
    normalized: false,
  },
  {
    path: 'evidence.candidates.0.promotionRequirements',
    replacement: ['CALL_PATH_REQUIRED'],
    normalized: false,
  },
  { path: 'evidence.coverage.backends', replacement: [], normalized: false },
  {
    path: 'evidence.coverage.backends.0.backend',
    replacement: 'codegraph',
    normalized: false,
  },
  {
    path: 'evidence.coverage.backends.0.status',
    replacement: 'failed',
    normalized: false,
  },
  {
    path: 'evidence.coverage.backends.0.reasonCode',
    replacement: 'BACKEND_ABORTED',
    normalized: false,
  },
  {
    path: 'evidence.coverage.backends.0.hitCount',
    replacement: 2,
    normalized: false,
  },
  {
    path: 'evidence.coverage.fallbackChecked',
    replacement: true,
    normalized: false,
  },
  {
    path: 'evidence.coverage.indexState',
    replacement: 'available',
    normalized: false,
  },
  {
    path: 'evidence.coverage.indexFreshness',
    replacement: 'possibly-stale',
    normalized: false,
  },
  {
    path: 'evidence.coverage.limitsReached',
    replacement: ['TIMEOUT_REACHED'],
    normalized: false,
  },
  {
    path: 'evidence.coverage.exclusionSummary',
    replacement: { OUTSIDE_LAYER_HINT: 2 },
    normalized: false,
  },
  { path: 'evidence.nextActions', replacement: [], normalized: false },
] satisfies readonly EvidencePackFieldMutation[]);

export function createEvidencePackMutationFixture(): LocateResult {
  return LocateResultSchema.parse({
    ok: true,
    evidence: {
      schemaVersion: '1.0',
      status: 'ok',
      repositoryRoot: 'D:/fixture',
      normalizedTerms: [{ value: 'targetField', caseSensitive: false }],
      confirmed: [
        {
          evidenceClass: 'confirmed',
          id: `evidence:v1:${'a'.repeat(64)}`,
          role: 'value-mapping',
          location: {
            file: 'server/mapping.ts',
            symbol: 'Mapping',
            lines: [1, 1],
            excerpt: 'const targetField = <redacted:secret-like-value>;',
            redaction: {
              applied: true,
              reasonCodes: ['SECRET_LIKE_VALUE'],
            },
          },
          provenance: {
            discoveredBy: ['ripgrep', 'filesystem'],
            verifiedBy: 'filesystem',
            operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
          },
          reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
        },
      ],
      candidates: [
        {
          evidenceClass: 'candidate',
          id: `evidence:v1:${'b'.repeat(64)}`,
          role: 'related',
          location: {
            file: 'server/candidate.ts',
            lines: [3, 3],
            excerpt: 'candidateField',
          },
          provenance: {
            discoveredBy: ['filesystem'],
            verifiedBy: 'filesystem',
            operations: ['FILESYSTEM_FIND_MATCHES'],
          },
          reasonCodes: [
            'SAME_SCOPE_SIMILAR_IDENTIFIER',
            'SAME_ENTITY_SIBLING',
          ],
          promotionRequirements: [
            'USER_SEMANTIC_CONFIRMATION',
            'DIRECT_REFERENCE_REQUIRED',
          ],
        },
      ],
      coverage: {
        backends: [
          {
            backend: 'ripgrep',
            status: 'used',
            reasonCode: 'RIPGREP_NO_RESULT',
            hitCount: 1,
          },
        ],
        fallbackChecked: false,
        indexState: 'unknown',
        indexFreshness: 'unknown',
        limitsReached: ['MAX_FILES_REACHED'],
        exclusionSummary: { NEGATIVE_TERM_MATCH: 1 },
      },
      nextActions: ['RETRY_WITH_HIGHER_LIMIT'],
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function applyEvidencePackFieldMutation(
  input: LocateResult,
  mutation: EvidencePackFieldMutation,
): unknown {
  const clone: unknown = JSON.parse(JSON.stringify(input)) as unknown;
  const segments = mutation.path.split('.');
  let current: unknown = clone;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      throw new Error(`Invalid mutation path: ${mutation.path}.`);
    }
    if (Array.isArray(current)) {
      const itemIndex = Number.parseInt(segment, 10);
      current = current[itemIndex];
    } else if (isRecord(current)) {
      current = current[segment];
    } else {
      throw new Error(`Mutation path is not traversable: ${mutation.path}.`);
    }
  }
  const last = segments.at(-1);
  if (last === undefined) {
    throw new Error('Mutation path must not be empty.');
  }
  if (Array.isArray(current)) {
    current[Number.parseInt(last, 10)] = mutation.replacement;
  } else if (isRecord(current)) {
    current[last] = mutation.replacement;
  } else {
    throw new Error(`Mutation target is not assignable: ${mutation.path}.`);
  }
  return clone;
}
