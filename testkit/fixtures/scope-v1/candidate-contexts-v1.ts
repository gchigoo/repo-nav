export const CANDIDATE_CONTEXTS_V1 = Object.freeze({
  defaultLayers: Object.freeze([] as const),
  explicitTestDocs: Object.freeze(['test', 'docs'] as const),
  defaultExcludedNeighbor: 'test/neighbor.ts',
  explicitCandidateNeighbor: 'test/neighbor.ts',
} as const);
