/** F1C-CONTRACT-001 fixtures for owner order, absence, duplicate/tag. */

import {
  LOCATE_FACT_OWNER_ORDER_V2,
  LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2,
  createLocateFactEnvelopeBuilderV2,
} from '../../../src/contracts/v2/locate-fact-envelope-v2.js';

export const FACT_CONTRACT_OWNER_ORDER_V2 = LOCATE_FACT_OWNER_ORDER_V2;
export const FACT_CONTRACT_PREREQUISITE_ORDER_V2 =
  LOCATE_PROJECTION_PREREQUISITE_OWNER_ORDER_V2;

export function createEmptyFragmentsEnvelopeV2() {
  return createLocateFactEnvelopeBuilderV2(
    '/tmp/repo-nav-fixture',
    Object.freeze([{ value: 'mapping', caseSensitive: false }]),
  ).freeze();
}
