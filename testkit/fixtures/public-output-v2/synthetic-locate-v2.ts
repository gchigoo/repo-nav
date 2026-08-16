import type { FinalizedUnsafeLocateResultV2 } from '../../../src/contracts/v2/locate-result-v2.js';

export function createUnsafeLocateSuccessV2(): FinalizedUnsafeLocateResultV2 {
  return {
    ok: true,
    evidence: {
      normalizedTerms: [{ value: 'mapping', caseSensitive: false }],
      confirmed: [
        {
          evidenceClass: 'confirmed',
          role: 'value-mapping',
          location: {
            file: 'src/server/mapping.ts',
            symbol: 'resolveMapping',
            lines: [1, 3],
            excerpt: 'export const resolveMapping = true;',
          },
          provenance: {
            discoveredBy: ['codegraph', 'filesystem'],
            verifiedBy: 'filesystem',
            operations: ['CODEGRAPH_QUERY', 'FILESYSTEM_READ_RANGE'],
          },
          reasonCodes: ['DIRECT_ALIAS_MAPPING'],
        },
      ],
      candidates: [],
      coverage: {
        backends: [
          {
            backend: 'codegraph',
            status: 'used',
            completion: 'complete',
            termination: 'none',
            hitCount: 1,
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
          filesChecked: 1,
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
      nextActions: [],
    },
  };
}
