import { describe, expect, it } from 'vitest';

import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import { requirePreFinalProducerBasisReceiptsV2 } from '../../src/evidence/request-snapshot/producer-basis-receipts-v2.js';
import type { EligibleDiscoveryRefV2 } from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import {
  arbitrateScopeBoundEvidenceProducerV2,
  createCandidateCollectorScopeProducerPortV2,
  createDirectClassifierScopeProducerPortV2,
  createScopeBoundProducerRegistrarV2,
  createTrustedPreFinalScopeClassificationViewForTestV2,
  materializeScopeBoundEvidenceV2,
  readScopeBoundDraftMapperCallCountForTestV2,
  registerScopeBoundProducerSourceV2,
  resetScopeBoundDraftMapperCallCountForTestV2,
  sealScopeBoundProducerRecordSetV2,
  ScopeProducerSourceInvariantError,
} from '../../src/evidence/scope/index.js';
import {
  PRODUCER_CONFIRMATIONS_V2,
  PRODUCER_KINDS_V2,
} from '../../testkit/fixtures/scope-v1/producer-matrix-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

function viewFor(
  execution: ReturnType<typeof executionToken>,
  record: EligibleDiscoveryRefV2,
  confirmation: 'allowed' | 'candidate-only',
) {
  return createTrustedPreFinalScopeClassificationViewForTestV2(
    execution,
    new Map([
      [
        record,
        Object.freeze({
          layer: 'server',
          included: true,
          confirmation,
        }),
      ],
    ]),
  );
}

describe.runIf(
  isSelected({
    group: 'repository-scope-policy',
    caseId: 'scope-bound-evidence-materializer-v2',
  }),
)('F7-MATERIALIZER-001 scope-bound-evidence-materializer-v2', () => {
  it('registers two base ports, seals complete set, and materializes eight-row table', () => {
    const execution = executionToken();
    const registrar = createScopeBoundProducerRegistrarV2(execution);
    const direct = createDirectClassifierScopeProducerPortV2(registrar, execution);
    const candidate = createCandidateCollectorScopeProducerPortV2(
      registrar,
      execution,
    );
    const record = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    const scopeView = viewFor(execution, record, 'allowed');

    expect(PRODUCER_KINDS_V2).toHaveLength(7);
    expect(PRODUCER_CONFIRMATIONS_V2).toContain('candidate-only');

    for (const kind of PRODUCER_KINDS_V2) {
      if (kind === 'derived-neighbor') {
        continue;
      }
      resetScopeBoundDraftMapperCallCountForTestV2();
      for (const confirmation of PRODUCER_CONFIRMATIONS_V2) {
        const perExecution = executionToken();
        const perRegistrar = createScopeBoundProducerRegistrarV2(perExecution);
        const perDirect = createDirectClassifierScopeProducerPortV2(
          perRegistrar,
          perExecution,
        );
        const perCandidate = createCandidateCollectorScopeProducerPortV2(
          perRegistrar,
          perExecution,
        );
        const perRecord = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
        const perView = viewFor(perExecution, perRecord, confirmation);
        const perBasis = requirePreFinalProducerBasisReceiptsV2({
          eligibleRef: perRecord,
          locationFile: 'src/server/a.ts',
          locationLines: [2, 2],
          execution: perExecution,
        });
        registerScopeBoundProducerSourceV2(
          perRegistrar,
          {
            kind: 'facts',
            view: {
              owner: 'direct-classifier',
              producerKind: kind,
              producerBasis: perBasis,
              definitionRole:
                kind === 'anchored-definition' ? 'definition' : undefined,
            },
          },
          perDirect,
          perView,
          perRecord,
          perExecution,
        );
        registerScopeBoundProducerSourceV2(
          perRegistrar,
          { kind: 'none' },
          perCandidate,
          perView,
          perRecord,
          perExecution,
        );
        const seal = sealScopeBoundProducerRecordSetV2(
          perRegistrar,
          perView,
          perRecord,
          perExecution,
        );
        const arbitration = arbitrateScopeBoundEvidenceProducerV2(
          seal,
          perView,
          perRecord,
          perExecution,
        );
        const draft = materializeScopeBoundEvidenceV2(
          arbitration,
          perView,
          perRecord,
          perExecution,
        );
        expect(draft).toBeDefined();
        if (confirmation === 'candidate-only') {
          expect(draft?.evidenceClass).toBe('candidate');
        } else if (
          kind === 'direct-anchored' ||
          kind === 'direct-term' ||
          kind === 'anchored-definition'
        ) {
          expect(draft?.evidenceClass).toBe('confirmed');
        } else {
          expect(draft?.evidenceClass).toBe('candidate');
        }
      }
      expect(readScopeBoundDraftMapperCallCountForTestV2()).toBe(
        PRODUCER_CONFIRMATIONS_V2.length,
      );
    }

    resetScopeBoundDraftMapperCallCountForTestV2();
    registerScopeBoundProducerSourceV2(
      registrar,
      { kind: 'none' },
      direct,
      scopeView,
      record,
      execution,
    );
    registerScopeBoundProducerSourceV2(
      registrar,
      { kind: 'none' },
      candidate,
      scopeView,
      record,
      execution,
    );
    const noneSeal = sealScopeBoundProducerRecordSetV2(
      registrar,
      scopeView,
      record,
      execution,
    );
    const noneArbitration = arbitrateScopeBoundEvidenceProducerV2(
      noneSeal,
      scopeView,
      record,
      execution,
    );
    expect(
      materializeScopeBoundEvidenceV2(
        noneArbitration,
        scopeView,
        record,
        execution,
      ),
    ).toBeUndefined();
    expect(readScopeBoundDraftMapperCallCountForTestV2()).toBe(0);

    expect(() =>
      registerScopeBoundProducerSourceV2(
        registrar,
        { kind: 'facts', view: { owner: 'candidate-collector' } },
        direct,
        scopeView,
        createOpaqueTokenV2<EligibleDiscoveryRefV2>(),
        execution,
      ),
    ).toThrow(ScopeProducerSourceInvariantError);
  });
});
