/**
 * F8 TrustedLanguageCapabilityObservationV2：唯一 adapter decision authority。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  requirePreFinalProducerBasisReceiptsV2,
  type VerifiedProducerBasisReceiptsV2,
} from '../request-snapshot/producer-basis-receipts-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { TrustedPreFinalScopeClassificationViewV2 } from '../request-snapshot/scope-classification-views-v2.js';
import { requirePreFinalScopeDecisionV1 } from '../scope/scope-decision-accessors-v1.js';
import type { RegisteredVerifiedLanguageConsumerV2 } from '../request-snapshot/verified-language-consumer-v2.js';
import type { VerifiedLanguageContextRefV2 } from '../request-snapshot/verified-language-consumer-v2.js';
import {
  readPreFinalCapabilitySourceTextV2,
  type TrustedPreFinalCapabilityViewV2,
} from '../request-snapshot/capability-classification-views-v2.js';
import type {
  LanguageAdapterKindV2,
  LanguageLexicalModeV2,
} from './language-adapter-kinds-v2.js';
import { requireDefaultLanguageEvidenceAdapterRegistryV2 } from './language-adapter-registry-v2.js';

declare const TRUSTED_LANGUAGE_CAPABILITY_OBSERVATION_V2: unique symbol;
export type TrustedLanguageCapabilityObservationV2 = Readonly<object> & {
  readonly [TRUSTED_LANGUAGE_CAPABILITY_OBSERVATION_V2]: never;
};

export interface LanguageAdapterDecisionEntryV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly adapter: LanguageAdapterKindV2;
  readonly mode: LanguageLexicalModeV2;
  readonly scopeConfirmation: 'allowed' | 'candidate-only';
  readonly producerBasis: VerifiedProducerBasisReceiptsV2;
  readonly contextRef: VerifiedLanguageContextRefV2;
  readonly extension: string | undefined;
  readonly sourceText: string;
  readonly matchedTerms: readonly string[];
  readonly matchedTermPresent: boolean;
  readonly anchoredSymbol?: string;
  readonly existingSymbol?: string;
}

export interface LanguageCapabilityObservationPrivateV2 {
  readonly capabilityView: TrustedPreFinalCapabilityViewV2;
  readonly scopeView: TrustedPreFinalScopeClassificationViewV2;
  readonly registeredConsumer: RegisteredVerifiedLanguageConsumerV2;
  readonly execution: LocateExecutionTokenV2;
  readonly decisions: ReadonlyMap<
    EligibleDiscoveryRefV2,
    LanguageAdapterDecisionEntryV2
  >;
}

const observationPrivate = new WeakMap<
  TrustedLanguageCapabilityObservationV2,
  LanguageCapabilityObservationPrivateV2
>();

export function createTrustedLanguageCapabilityObservationV2(
  capabilityView: TrustedPreFinalCapabilityViewV2,
  scopeView: TrustedPreFinalScopeClassificationViewV2,
  registeredConsumer: RegisteredVerifiedLanguageConsumerV2,
  execution: LocateExecutionTokenV2,
  options?: {
    readonly matchedTermsByRef?: ReadonlyMap<
      EligibleDiscoveryRefV2,
      readonly string[]
    >;
    readonly anchoredSymbolByRef?: ReadonlyMap<
      EligibleDiscoveryRefV2,
      string | undefined
    >;
  },
): TrustedLanguageCapabilityObservationV2 {
  const registry = requireDefaultLanguageEvidenceAdapterRegistryV2();
  const decisions = new Map<
    EligibleDiscoveryRefV2,
    LanguageAdapterDecisionEntryV2
  >();
  for (const record of capabilityView.records()) {
    const scopeDecision = requirePreFinalScopeDecisionV1(
      scopeView,
      record.eligibleRef,
      execution,
    );
    if (scopeDecision.confirmation === 'excluded') {
      throw new TypeError('excluded record unreachable in language observation');
    }
    const extension = capabilityView.verifiedLastExtension(record.eligibleRef);
    const adapter = registry.resolveAdapter(extension);
    const mode =
      registry.modeForExtension(extension) ??
      (adapter === 'fallback' ? 'ts' : undefined);
    if (mode === undefined) {
      throw new TypeError('missing lexical mode for semantic adapter');
    }
    const contextRef = capabilityView.verifiedLanguageContext(
      record.eligibleRef,
    );
    const sourceText = readPreFinalCapabilitySourceTextV2(
      capabilityView,
      record.eligibleRef,
      execution,
    );
    const producerBasis = requirePreFinalProducerBasisReceiptsV2({
      eligibleRef: record.eligibleRef,
      locationFile: '',
      locationLines: [1, 1],
      execution,
    });
    const matchedTerms =
      options?.matchedTermsByRef?.get(record.eligibleRef) ?? Object.freeze([]);
    const anchoredSymbol = options?.anchoredSymbolByRef?.get(
      record.eligibleRef,
    );
    decisions.set(
      record.eligibleRef,
      Object.freeze({
        eligibleRef: record.eligibleRef,
        adapter,
        mode: adapter === 'fallback' ? 'ts' : mode,
        scopeConfirmation: scopeDecision.confirmation,
        producerBasis,
        contextRef,
        extension,
        sourceText,
        matchedTerms,
        matchedTermPresent: matchedTerms.length > 0,
        ...(anchoredSymbol === undefined ? {} : { anchoredSymbol }),
        ...(anchoredSymbol === undefined
          ? {}
          : { existingSymbol: anchoredSymbol }),
      }),
    );
  }
  const observation =
    createOpaqueTokenV2<TrustedLanguageCapabilityObservationV2>();
  observationPrivate.set(
    observation,
    Object.freeze({
      capabilityView,
      scopeView,
      registeredConsumer,
      execution,
      decisions,
    }),
  );
  return observation;
}

export function requireLanguageCapabilityObservationPrivateV2(
  observation: TrustedLanguageCapabilityObservationV2,
  execution: LocateExecutionTokenV2,
): LanguageCapabilityObservationPrivateV2 {
  const record = observationPrivate.get(observation);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('language capability observation untrusted');
  }
  return record;
}

export function readLanguageAdapterDecisionV2(
  observation: TrustedLanguageCapabilityObservationV2,
  eligibleRef: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): LanguageAdapterDecisionEntryV2 {
  const record = requireLanguageCapabilityObservationPrivateV2(
    observation,
    execution,
  );
  const decision = record.decisions.get(eligibleRef);
  if (decision === undefined) {
    throw new TypeError('language adapter decision missing');
  }
  return decision;
}
