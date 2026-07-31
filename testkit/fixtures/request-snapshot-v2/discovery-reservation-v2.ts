import {
  DISCOVERY_RESERVATION_CAP_FORMULA_V2,
  DISCOVERY_RESERVATION_CAP_V2,
  PRE_RANKING_CANDIDATE_CAP_FORMULA_V2,
  PRE_RANKING_CANDIDATE_CAP_V2,
} from '../../../src/evidence/request-snapshot/discovery-reservation-v2.js';

/**
 * F3-DISCOVERY-001：expanded cap 与 request final evidence budgets 独立。
 */
export const DISCOVERY_RESERVATION_EXPECTED_CAP_V2 = 800;
export const PRE_RANKING_EXPECTED_CAP_V2 = 16_000;

export const DISCOVERY_LIMIT_PERMUTATIONS_V2 = Object.freeze([
  Object.freeze({ maxFiles: 1, maxConfirmed: 1, maxCandidates: 0 }),
  Object.freeze({ maxFiles: 8, maxConfirmed: 8, maxCandidates: 8 }),
  Object.freeze({ maxFiles: 20, maxConfirmed: 20, maxCandidates: 20 }),
]);

export function assertDiscoveryReservationConstantsV2(): void {
  if (DISCOVERY_RESERVATION_CAP_V2 !== DISCOVERY_RESERVATION_EXPECTED_CAP_V2) {
    throw new Error('DISCOVERY_RESERVATION_CAP_V2 drift');
  }
  if (DISCOVERY_RESERVATION_CAP_V2 !== DISCOVERY_RESERVATION_CAP_FORMULA_V2) {
    throw new Error('DISCOVERY_RESERVATION_CAP_V2 formula drift');
  }
  if (PRE_RANKING_CANDIDATE_CAP_V2 !== PRE_RANKING_EXPECTED_CAP_V2) {
    throw new Error('PRE_RANKING_CANDIDATE_CAP_V2 drift');
  }
  if (PRE_RANKING_CANDIDATE_CAP_V2 !== PRE_RANKING_CANDIDATE_CAP_FORMULA_V2) {
    throw new Error('PRE_RANKING_CANDIDATE_CAP_V2 formula drift');
  }
}
