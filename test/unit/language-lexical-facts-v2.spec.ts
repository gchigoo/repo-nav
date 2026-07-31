import { describe, expect, it } from 'vitest';

import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import type {
  EligibleDiscoveryRefV2,
  OpaqueFileBucketRefV2,
  PreFinalEligibleDiscoveryPoolV2,
} from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createTrustedPreFinalCapabilityViewForTestV2 } from '../../src/evidence/request-snapshot/capability-classification-views-v2.js';
import { createTrustedPreFinalScopeClassificationViewForTestV2 } from '../../src/evidence/request-snapshot/scope-classification-views-v2.js';
import {
  createVerifiedLanguageConsumerAdmissionV2,
  registerVerifiedLanguageConsumerV2,
} from '../../src/evidence/request-snapshot/verified-language-consumer-v2.js';
import { createTrustedLanguageCapabilityObservationV2 } from '../../src/evidence/language/language-capability-observation-v2.js';
import {
  createLanguageLexicalPreparationRefV2,
  prepareLanguageClassificationInputV2,
  readLexicalFactsBucketProbeV2,
} from '../../src/evidence/language/language-lexical-coordinator-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'one-time-lexical-facts',
  }),
)('F8-LEXICAL-001 one-time-lexical-facts', () => {
  it('shares one internal facts promise per context+mode with distinct wrappers', async () => {
    const execution = executionToken();
    const eligibleA = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    const eligibleB = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    const bucket = createOpaqueTokenV2<OpaqueFileBucketRefV2>();
    const pool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
      records: Object.freeze([
        Object.freeze({
          eligibleRef: eligibleA,
          discoveryKey: 'a',
          canonicalFileKey: 'src/a.ts' as never,
          fileBucketRef: bucket,
          classificationDefined: true,
        }),
        Object.freeze({
          eligibleRef: eligibleB,
          discoveryKey: 'b',
          canonicalFileKey: 'src/a.ts' as never,
          fileBucketRef: bucket,
          classificationDefined: true,
        }),
      ]),
    });
    const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
      pool,
      execution,
      entries: [
        {
          eligibleRef: eligibleA,
          fileBucketRef: bucket,
          posixPath: 'src/a.ts',
          sourceText: 'const x = 1;',
        },
        {
          eligibleRef: eligibleB,
          fileBucketRef: bucket,
          posixPath: 'src/a.ts',
          sourceText: 'const x = 1;',
        },
      ],
    });
    const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
      execution,
      new Map([
        [
          eligibleA,
          Object.freeze({
            layer: 'server' as const,
            included: true,
            confirmation: 'allowed' as const,
          }),
        ],
        [
          eligibleB,
          Object.freeze({
            layer: 'server' as const,
            included: true,
            confirmation: 'allowed' as const,
          }),
        ],
      ]),
    );
    const admission = createVerifiedLanguageConsumerAdmissionV2(
      'language-capability',
      execution,
    );
    const registered = registerVerifiedLanguageConsumerV2(
      admission,
      {
        async consumeVerifiedContext() {},
      },
      execution,
    );
    const observation = createTrustedLanguageCapabilityObservationV2(
      capabilityView,
      scopeView,
      registered,
      execution,
      {
        matchedTermsByRef: new Map([
          [eligibleA, Object.freeze(['x'])],
          [eligibleB, Object.freeze(['x'])],
        ]),
      },
    );

    const prepA = createLanguageLexicalPreparationRefV2(
      observation,
      eligibleA,
      execution,
    );
    const prepB = createLanguageLexicalPreparationRefV2(
      observation,
      eligibleB,
      execution,
    );
    const [inputA, inputB] = await Promise.all([
      prepareLanguageClassificationInputV2(
        observation,
        eligibleA,
        { kind: 'semantic', preparationRef: prepA },
        execution,
      ),
      prepareLanguageClassificationInputV2(
        observation,
        eligibleB,
        { kind: 'semantic', preparationRef: prepB },
        execution,
      ),
    ]);
    expect(inputA).not.toBe(inputB);

    const contextRef = capabilityView.verifiedLanguageContext(eligibleA);
    const probe = readLexicalFactsBucketProbeV2(contextRef, 'ts', execution);
    expect(probe.carrierIssued).toBe(1);
    expect(probe.kernelInvocations).toBe(1);
    expect(probe.state).toBe('fulfilled');
  });
});
