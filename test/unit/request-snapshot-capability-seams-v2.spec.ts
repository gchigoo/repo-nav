import { describe, expect, it } from 'vitest';

import {
  CandidateTokenProposalEnumeratorV2,
  readCandidateTokenProposalFactsV2,
} from '../../src/evidence/request-snapshot/candidate-token-proposal-enumerator-v2.js';
import { createVerifiedCandidateContext } from '../../src/evidence/candidate-policy.js';
import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import {
  registerDerivedEvidenceProposalRefV2,
  requirePreFinalDerivedProducerBasisReceiptsV2,
  requirePreFinalProducerBasisReceiptsV2,
  requireScopeBoundProducerBasisV2,
} from '../../src/evidence/request-snapshot/producer-basis-receipts-v2.js';
import {
  createScopeCoverageBasisV2,
  requireScopeCoverageBasisV2,
} from '../../src/evidence/request-snapshot/scope-coverage-basis-v2.js';
import type {
  SnapshotTrustProofV2,
  TrustedStableEligibleDiscoveryPoolV2,
} from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import type { ScopeFoldedSafePoolProofV2 } from '../../src/evidence/request-snapshot/scope-folded-discovery-selector-v2.js';
import type { DiscoveryLocatorRefV2 } from '../../src/evidence/request-snapshot/discovery-lane-universe-v2.js';
import type { EligibleDiscoveryRefV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  consumeVerifiedLanguageContextV2,
  createVerifiedLanguageConsumerAdmissionV2,
  createVerifiedLanguageContextRefV2,
  issueVerifiedLanguagePreparationCarrierV2,
  registerVerifiedLanguageConsumerV2,
} from '../../src/evidence/request-snapshot/verified-language-consumer-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const producerSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'producer-basis-receipts',
});
const languageSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'verified-language-consumer-carrier',
});
const coverageSelected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'scope-coverage-basis',
});

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(producerSelected)(
  'F3-PRODUCER-BASIS-001 producer-basis-receipts',
  () => {
    it('keeps proposal location distinct from seed record location', () => {
      const execution = executionToken();
      const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
      const recordReceipts = requirePreFinalProducerBasisReceiptsV2({
        eligibleRef,
        locationFile: 'server/seed.ts',
        locationLines: [1, 1],
        execution,
      });
      const recordView = requireScopeBoundProducerBasisV2(
        recordReceipts,
        execution,
      );
      expect(recordView.subject).toBe('record');
      expect(recordView.locationFile).toBe('server/seed.ts');

      const enumerator = new CandidateTokenProposalEnumeratorV2();
      const proposals = enumerator.enumerate(
        createVerifiedCandidateContext(
          {
            discoveryKey: 'seed',
            location: {
              file: 'server/seed.ts',
              lines: [1, 1],
              excerpt: 'const seed = sibling;',
            },
            discoveredBy: ['ripgrep'],
            operations: ['RIPGREP_SEARCH'],
            discoveryReasonCodes: ['LITERAL_TERM_HIT'],
            matchedTerms: [{ value: 'seed', caseSensitive: true }],
            focusLines: [1, 1],
            focusExcerpt: 'const seed = sibling;',
            canonicalSymbols: ['seed'],
          },
          {
            file: 'server/seed.ts',
            lines: [1, 1],
            excerpt: 'const seed = sibling;',
          },
        ),
      );
      const proposal = proposals.find(
        (token) =>
          readCandidateTokenProposalFactsV2(token).normalizedValue ===
          'sibling',
      );
      expect(proposal).toBeDefined();
      const proposalRef = registerDerivedEvidenceProposalRefV2({
        seedEligibleRef: eligibleRef,
        proposal: proposal!,
        execution,
      });
      const derivedReceipts = requirePreFinalDerivedProducerBasisReceiptsV2({
        proposalRef,
        execution,
      });
      const derivedView = requireScopeBoundProducerBasisV2(
        derivedReceipts,
        execution,
      );
      expect(derivedView.subject).toBe('derived-proposal');
      expect(derivedView.locationFile).toBe('server/seed.ts');
      expect(derivedView.symbol).toBe('sibling');
    });
  },
);

describe.runIf(languageSelected)(
  'F3-LANGUAGE-CARRIER-001 verified-language-consumer-carrier',
  () => {
    it('delivers one-shot ephemeral cursor and rejects duplicate consume', async () => {
      const execution = executionToken();
      const admission = createVerifiedLanguageConsumerAdmissionV2(
        'request-snapshot-baseline',
        execution,
      );
      let seenLength = 0;
      const registered = registerVerifiedLanguageConsumerV2(
        admission,
        {
          async consumeVerifiedContext(_context, _prep, source) {
            seenLength = source.codeUnitLength;
            expect(source.codeUnitAt(0)).toBe('h'.charCodeAt(0));
          },
        },
        execution,
      );
      const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
      const contextRef = createVerifiedLanguageContextRefV2();
      const carrier = issueVerifiedLanguagePreparationCarrierV2({
        eligibleRef,
        contextRef,
        registeredConsumer: registered,
        expectedExecution: execution,
        sourceText: 'hello',
      });
      await consumeVerifiedLanguageContextV2({
        eligibleRef,
        contextRef,
        preparation: carrier,
        registeredConsumer: registered,
        expectedExecution: execution,
      });
      expect(seenLength).toBe(5);
      await expect(
        consumeVerifiedLanguageContextV2({
          eligibleRef,
          contextRef,
          preparation: carrier,
          registeredConsumer: registered,
          expectedExecution: execution,
        }),
      ).rejects.toThrow(/rejected/i);
    });
  },
);

describe.runIf(coverageSelected)(
  'F3-SCOPE-COVERAGE-BASIS-001 scope-coverage-basis',
  () => {
    it('counts unique excluded identities and ignores mixed included members', () => {
      const execution = executionToken();
      const excludedA = createOpaqueTokenV2<DiscoveryLocatorRefV2>();
      const excludedB = createOpaqueTokenV2<DiscoveryLocatorRefV2>();
      const mixedIncluded = createOpaqueTokenV2<DiscoveryLocatorRefV2>();
      const eligiblePool =
        createOpaqueTokenV2<TrustedStableEligibleDiscoveryPoolV2>();
      const snapshotProof = createOpaqueTokenV2<SnapshotTrustProofV2>();
      const foldProof = createOpaqueTokenV2<ScopeFoldedSafePoolProofV2>();
      const basis = createScopeCoverageBasisV2({
        excludedLocatorRefs: [excludedA, excludedB, excludedA],
        mixedIncludedLocatorRefs: [mixedIncluded],
        stableEligiblePool: eligiblePool,
        snapshotProof,
        foldProof,
        execution,
      });
      const view = requireScopeCoverageBasisV2(
        basis,
        eligiblePool,
        snapshotProof,
        foldProof,
        execution,
      );
      expect(view.outsideLayerHintCount).toBe(2);
      expect(() =>
        requireScopeCoverageBasisV2(
          basis,
          eligiblePool,
          createOpaqueTokenV2<SnapshotTrustProofV2>(),
          foldProof,
          execution,
        ),
      ).toThrow(/mismatch/i);
    });
  },
);
