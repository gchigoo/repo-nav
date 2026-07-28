import type { ScopeBoundProducerKindV2 } from '../../../src/evidence/scope/scope-bound-producer-registrar-v2.js';

export const PRODUCER_KINDS_V2: readonly ScopeBoundProducerKindV2[] = Object.freeze([
  'direct-anchored',
  'direct-term',
  'anchored-definition',
  'anchored-reference',
  'verified-literal',
  'secondary',
  'derived-neighbor',
]);

export const PRODUCER_CONFIRMATIONS_V2 = Object.freeze([
  'allowed',
  'candidate-only',
] as const);
