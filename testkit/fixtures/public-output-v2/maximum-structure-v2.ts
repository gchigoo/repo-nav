/**
 * F1B-MAX-STRUCTURE-001: maximum legal source/public structure under frozen budgets.
 */

import { LOCATE_RESULT_RESOURCE_BUDGETS_V2 } from '../../../src/contracts/v2/locate-result-resource-budget-contract-v2.js';
import type { FinalizedUnsafeLocateResultV2 } from '../../../src/contracts/v2/locate-result-v2.js';
import { utf8Repeat } from './resource-budgets-v2.js';

const B = LOCATE_RESULT_RESOURCE_BUDGETS_V2;

function maxRawEvidence(index: number, kind: 'confirmed' | 'candidate') {
  const file = `f${String(index).padStart(2, '0')}/${utf8Repeat('p', 64)}/${utf8Repeat('q', 64)}.ts`;
  const symbol = utf8Repeat('S', 128);
  const excerpt = utf8Repeat('E', 256);
  if (kind === 'confirmed') {
    return {
      evidenceClass: 'confirmed' as const,
      role: 'value-mapping' as const,
      location: { file, symbol, lines: [1, 3] as const, excerpt },
      provenance: {
        discoveredBy: ['codegraph', 'filesystem'] as const,
        verifiedBy: 'filesystem' as const,
        operations: ['CODEGRAPH_QUERY', 'FILESYSTEM_READ_RANGE'] as const,
      },
      reasonCodes: ['DIRECT_ALIAS_MAPPING'] as const,
    };
  }
  return {
    evidenceClass: 'candidate' as const,
    role: 'related' as const,
    location: { file, symbol, lines: [1, 3] as const, excerpt },
    provenance: {
      discoveredBy: ['ripgrep', 'filesystem'] as const,
      verifiedBy: 'filesystem' as const,
      operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'] as const,
    },
    reasonCodes: ['SAME_ENTITY_SIBLING'] as const,
    promotionRequirements: ['USER_SEMANTIC_CONFIRMATION'] as const,
  };
}

export function createMaximumUnsafeSourceV2(): FinalizedUnsafeLocateResultV2 {
  const terms = Array.from({ length: B.normalizedTerms.maxItems }, (_, i) => ({
    value: `term${String(i).padStart(2, '0')}${utf8Repeat('t', 8)}`,
    caseSensitive: i % 2 === 0,
  }));
  const confirmed = Array.from({ length: B.evidence.maxConfirmed }, (_, i) =>
    maxRawEvidence(i, 'confirmed'),
  );
  const candidates = Array.from({ length: B.evidence.maxCandidates }, (_, i) =>
    maxRawEvidence(i + B.evidence.maxConfirmed, 'candidate'),
  );
  const unsatisfiedAnchors = Array.from(
    { length: B.coverage.maxUnsatisfiedAnchors },
    (_, i) => ({
      requestIndex: i,
      kind: (['symbol', 'file', 'table', 'route', 'term'] as const)[i % 5]!,
      satisfaction: 'none' as const,
      reason: 'NOT_FOUND' as const,
    }),
  );
  return {
    ok: true,
    evidence: {
      normalizedTerms: terms,
      confirmed: confirmed as never,
      candidates: candidates as never,
      coverage: {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: B.evidence.maxConfirmed,
          },
          {
            backend: 'ripgrep',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: B.evidence.maxCandidates,
          },
        ],
        strategyComplete: true,
        fallbackChecked: true,
        indexState: 'available',
        indexFreshness: 'not-applicable',
        limitsReached: ['MAX_CONFIRMED_REACHED', 'MAX_CANDIDATES_REACHED'],
        degradations: [],
        exclusionSummary: {
          NEGATIVE_TERM_MATCH: 1,
          OUTSIDE_LAYER_HINT: 1,
          DUPLICATE_LOCATION: 1,
          UNVERIFIED_FILE_CONTENT: 1,
        },
        abortSource: 'none',
        unsatisfiedAnchors,
        snapshot: {
          gitState: 'clean',
          consistency: 'stable',
          filesChecked: B.evidence.maxTotal,
          discardedEvidenceCount: 0,
        },
        scope: {
          requested: [
            'client',
            'server',
            'db',
            'test',
            'docs',
            'config',
            'unknown',
          ],
          effective: [
            'client',
            'server',
            'db',
            'test',
            'docs',
            'config',
            'unknown',
          ],
          policyVersion: 'repo-scope-v1',
          unmatchedLayers: [],
        },
        capabilities: {
          textSearch: 'supported-text-files',
          semanticClassification: [
            'typescript',
            'javascript',
            'sql',
            'python',
            'go',
          ],
          unsupportedLanguageHits: 0,
        },
      },
      nextActions: [
        'ADD_TERM',
        'ADD_SYMBOL_ANCHOR',
        'CONFIRM_CANDIDATE',
        'INITIALIZE_CODEGRAPH',
        'RETRY_WITH_HIGHER_LIMIT',
      ],
    },
  };
}

export function measureCompactJsonUtf8Bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}
