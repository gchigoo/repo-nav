import type { CodeGraphIndexObservationV2 } from '../../../src/contracts/v2/backend-execution-outcome-v2.js';

export const INDEX_OBSERVATION_MATRIX_V2 = Object.freeze([
  Object.freeze({
    observation: { kind: 'not-observed' } as CodeGraphIndexObservationV2,
    indexState: 'unknown',
    indexFreshness: 'unknown',
  }),
  Object.freeze({
    observation: {
      kind: 'available',
      possiblyStale: false,
    } as CodeGraphIndexObservationV2,
    indexState: 'available',
    indexFreshness: 'unknown',
  }),
  Object.freeze({
    observation: {
      kind: 'available',
      possiblyStale: true,
    } as CodeGraphIndexObservationV2,
    indexState: 'available',
    indexFreshness: 'possibly-stale',
  }),
  Object.freeze({
    observation: { kind: 'missing-index' } as CodeGraphIndexObservationV2,
    indexState: 'missing',
    indexFreshness: 'not-applicable',
  }),
  Object.freeze({
    observation: { kind: 'tool-unavailable' } as CodeGraphIndexObservationV2,
    indexState: 'unavailable',
    indexFreshness: 'not-applicable',
  }),
  Object.freeze({
    observation: { kind: 'error' } as CodeGraphIndexObservationV2,
    indexState: 'error',
    indexFreshness: 'unknown',
  }),
] as const);
