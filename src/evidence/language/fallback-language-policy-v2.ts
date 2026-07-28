/**
 * F8 fallback literal policy：不调用 semantic kernel / neighbor / confirmed。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { UnsafeEvidenceDraftV2 } from '../request-snapshot/classified-evidence-record-v2.js';
import type { ScopeBoundProducerArbitrationV2 } from '../scope/scope-bound-producer-registrar-v2.js';
import { requireScopeBoundProducerArbitrationV2 } from '../scope/scope-bound-producer-registrar-v2.js';
import type { TrustedPreFinalScopeClassificationViewV2 } from '../request-snapshot/scope-classification-views-v2.js';
import {
  requireFallbackLiteralCandidateFactsV2,
  signFallbackLiteralCandidateFactsV2,
  signLanguageAdapterSourceRefV2,
  type FallbackLiteralCandidateFactsV2,
  type LanguageAdapterProducerResultV2,
} from './language-adapter-producer-v2.js';
import type { VerifiedFallbackLanguageClassificationInputV2 } from './language-lexical-coordinator-v2.js';
import { requireFallbackLanguageClassificationInputV2 } from './language-lexical-coordinator-v2.js';
import type { TrustedLanguageCapabilityObservationV2 } from './language-capability-observation-v2.js';

export const UNSUPPORTED_LANGUAGE_LITERAL_REASON =
  'UNSUPPORTED_LANGUAGE_LITERAL' as const;
export const SUPPORTED_LANGUAGE_ADAPTER_REQUIRED =
  'SUPPORTED_LANGUAGE_ADAPTER_REQUIRED' as const;

export function createFallbackLanguagePolicyV2(): Readonly<{
  kind: 'fallback';
  classifyLiteral(
    input: VerifiedFallbackLanguageClassificationInputV2,
  ): FallbackLiteralCandidateFactsV2 | undefined;
}> {
  return Object.freeze({
    kind: 'fallback' as const,
    classifyLiteral(input) {
      const view = requireFallbackLanguageClassificationInputV2(input);
      if (!view.matchedTermPresent) {
        return undefined;
      }
      return signFallbackLiteralCandidateFactsV2({
        eligibleRef: view.eligibleRef,
        ...(view.existingSymbol === undefined
          ? {}
          : { existingSymbol: view.existingSymbol }),
        execution: view.execution,
      });
    },
  });
}

export function dispatchFallbackLanguageResultV2(
  input: VerifiedFallbackLanguageClassificationInputV2,
): LanguageAdapterProducerResultV2 {
  const view = requireFallbackLanguageClassificationInputV2(input);
  const policy = createFallbackLanguagePolicyV2();
  const facts = policy.classifyLiteral(input);
  const sourceRef = signLanguageAdapterSourceRefV2({
    producerKind: 'none',
    producerBasis: view.producerBasis,
    eligibleRef: view.eligibleRef,
    execution: view.execution,
    lane: 'fallback',
    matchedTermPresent: view.matchedTermPresent,
    structureComplete: true,
    ...(facts === undefined ? {} : { fallbackFacts: facts }),
  });
  if (facts === undefined) {
    return Object.freeze({
      kind: 'fallback-none',
      producerKind: 'none' as const,
      sourceRef,
    });
  }
  return Object.freeze({
    kind: 'fallback-literal',
    producerKind: 'none' as const,
    sourceRef,
    facts,
  });
}

/**
 * 唯一 fallback literal factory：仅在 F7 arbitration none 且有 term 时调用。
 */
export function materializeFallbackLiteralCandidateV2(
  facts: FallbackLiteralCandidateFactsV2,
  arbitration: ScopeBoundProducerArbitrationV2,
  _scopeView: TrustedPreFinalScopeClassificationViewV2,
  record: EligibleDiscoveryRefV2,
  _observation: TrustedLanguageCapabilityObservationV2,
  execution: LocateExecutionTokenV2,
): UnsafeEvidenceDraftV2 {
  const arbitrationView = requireScopeBoundProducerArbitrationV2(
    arbitration,
    _scopeView,
    record,
    execution,
  );
  if (arbitrationView.kind !== 'none') {
    throw new TypeError('fallback literal suppressed when arbitration has facts');
  }
  const view = requireFallbackLiteralCandidateFactsV2(facts, execution);
  if (view.eligibleRef !== record) {
    throw new TypeError('fallback literal record mismatch');
  }
  return Object.freeze({
    evidenceClass: 'candidate' as const,
    role: 'reference' as const,
    location: Object.freeze({
      file: '',
      lines: Object.freeze([1, 1] as const),
      excerpt: '',
      ...(view.existingSymbol === undefined
        ? {}
        : { symbol: view.existingSymbol }),
    }),
    provenance: Object.freeze({
      discoveredBy: Object.freeze(['filesystem'] as const),
      verifiedBy: 'filesystem' as const,
      operations: Object.freeze(['FILESYSTEM_READ_RANGE'] as const),
    }),
    reasonCodes: Object.freeze([UNSUPPORTED_LANGUAGE_LITERAL_REASON]),
    promotionRequirements: Object.freeze([
      SUPPORTED_LANGUAGE_ADAPTER_REQUIRED,
    ]),
  }) as unknown as UnsafeEvidenceDraftV2;
}
