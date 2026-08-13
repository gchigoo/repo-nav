import { describe, expect, it } from 'vitest';

import {
  DISCOVERY_RESERVATION_CAP_V2,
  createMultiViewBackendSearchRequestV2,
  legacyMaxHitsFromPublicLimitsV2,
} from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  DISCOVERY_LIMIT_PERMUTATIONS_V2,
  assertDiscoveryReservationConstantsV2,
} from '../../testkit/fixtures/request-snapshot-v2/discovery-reservation-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'discovery-reservation-budget-independence',
});

describe.runIf(selected)(
  'F3-DISCOVERY-001 discovery-reservation-budget-independence',
  () => {
    it('keeps expandedMaxHits fixed at 800 across request limit permutations', () => {
      assertDiscoveryReservationConstantsV2();
      const base = Object.freeze({
        repositoryRoot: '/tmp/repo',
        terms: Object.freeze([{ value: 'x', caseSensitive: true }]),
        anchors: Object.freeze([]),
        negativeTerms: Object.freeze([]),
        layers: Object.freeze([]),
      });

      for (const limits of DISCOVERY_LIMIT_PERMUTATIONS_V2) {
        const legacyMaxHits = legacyMaxHitsFromPublicLimitsV2(limits);
        const request = createMultiViewBackendSearchRequestV2(
          base,
          legacyMaxHits,
        );
        expect(request.expandedMaxHits).toBe(DISCOVERY_RESERVATION_CAP_V2);
        expect(request.expandedMaxHits).toBe(800);
        expect(request.legacyMaxHits).toBe(legacyMaxHits);
        expect(
          Object.prototype.hasOwnProperty.call(
            request,
            'discoveryReservationCap',
          ),
        ).toBe(false);
      }

      const narrow = createMultiViewBackendSearchRequestV2(base, 1);
      const wide = createMultiViewBackendSearchRequestV2(base, 800);
      expect(narrow.expandedMaxHits).toBe(wide.expandedMaxHits);
      expect(narrow.legacyMaxHits).not.toBe(wide.legacyMaxHits);
    });
  },
);
