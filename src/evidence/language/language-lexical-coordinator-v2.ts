/**
 * F8 lexical preparation / one-time facts / distinct per-ref wrappers。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { VerifiedProducerBasisReceiptsV2 } from '../request-snapshot/producer-basis-receipts-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import {
  consumeVerifiedLanguageContextV2,
  issueVerifiedLanguagePreparationCarrierV2,
  type RegisteredVerifiedLanguageConsumerV2,
  type VerifiedLanguageContextConsumptionProofV2,
  type VerifiedLanguageContextRefV2,
  type VerifiedLanguagePreparationCarrierV2,
} from '../request-snapshot/verified-language-consumer-v2.js';
import { balancedStructureV2 } from './identifier-structure-kernel-v2.js';
import { maskNonCode } from './ecmascript-lexical-kernel-v2.js';
import { maskSqlNonCode } from './sql-lexical-kernel-v2.js';
import type {
  LanguageAdapterKindV2,
  LanguageLexicalModeV2,
  LexicalRegistryStateV2,
} from './language-adapter-kinds-v2.js';
import type { TrustedLanguageCapabilityObservationV2 } from './language-capability-observation-v2.js';
import { requireLanguageCapabilityObservationPrivateV2 } from './language-capability-observation-v2.js';

declare const LANGUAGE_LEXICAL_PREPARATION_REF_V2: unique symbol;
export type LanguageLexicalPreparationRefV2 = Readonly<object> & {
  readonly [LANGUAGE_LEXICAL_PREPARATION_REF_V2]: never;
};

declare const VERIFIED_SEMANTIC_LANGUAGE_CLASSIFICATION_INPUT_V2: unique symbol;
export type VerifiedSemanticLanguageClassificationInputV2 = Readonly<object> & {
  readonly [VERIFIED_SEMANTIC_LANGUAGE_CLASSIFICATION_INPUT_V2]: never;
};

declare const VERIFIED_FALLBACK_LANGUAGE_CLASSIFICATION_INPUT_V2: unique symbol;
export type VerifiedFallbackLanguageClassificationInputV2 = Readonly<object> & {
  readonly [VERIFIED_FALLBACK_LANGUAGE_CLASSIFICATION_INPUT_V2]: never;
};

export type LanguageClassificationPreparationV2 =
  | Readonly<{
      kind: 'semantic';
      preparationRef: LanguageLexicalPreparationRefV2;
    }>
  | Readonly<{ kind: 'fallback' }>;

interface PreparationPrivateV2 {
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly contextRef: VerifiedLanguageContextRefV2;
  readonly adapter: LanguageAdapterKindV2;
  readonly mode: LanguageLexicalModeV2;
  readonly execution: LocateExecutionTokenV2;
  readonly producerBasis: VerifiedProducerBasisReceiptsV2;
  role: 'unbound' | 'leader' | 'follower';
  carrier: VerifiedLanguagePreparationCarrierV2 | undefined;
  proof: VerifiedLanguageContextConsumptionProofV2 | undefined;
}

interface FactsBucketV2 {
  state: LexicalRegistryStateV2;
  internalPromise?: Promise<LexicalFactsPayloadV2>;
  facts?: LexicalFactsPayloadV2;
  carrierIssued: number;
  kernelInvocations: number;
  leaderPreparation?: LanguageLexicalPreparationRefV2;
}

interface LexicalFactsPayloadV2 {
  readonly sourceText: string;
  readonly structureComplete: boolean;
  readonly mode: LanguageLexicalModeV2;
}

interface SemanticInputPrivateV2 {
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly contextRef: VerifiedLanguageContextRefV2;
  readonly mode: LanguageLexicalModeV2;
  readonly preparationRef: LanguageLexicalPreparationRefV2;
  readonly proof: VerifiedLanguageContextConsumptionProofV2;
  readonly producerBasis: VerifiedProducerBasisReceiptsV2;
  readonly execution: LocateExecutionTokenV2;
  readonly sourceText: string;
  readonly structureComplete: boolean;
  readonly matchedTerms: readonly string[];
  readonly anchoredSymbol?: string;
}

interface FallbackInputPrivateV2 {
  readonly observation: TrustedLanguageCapabilityObservationV2;
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly producerBasis: VerifiedProducerBasisReceiptsV2;
  readonly execution: LocateExecutionTokenV2;
  readonly matchedTermPresent: boolean;
  readonly existingSymbol?: string;
}

const preparationPrivate = new WeakMap<
  LanguageLexicalPreparationRefV2,
  PreparationPrivateV2
>();
const semanticInputPrivate = new WeakMap<
  VerifiedSemanticLanguageClassificationInputV2,
  SemanticInputPrivateV2
>();
const fallbackInputPrivate = new WeakMap<
  VerifiedFallbackLanguageClassificationInputV2,
  FallbackInputPrivateV2
>();

/** contextRef → mode → shared facts bucket */
const factsBuckets = new WeakMap<
  VerifiedLanguageContextRefV2,
  Map<string, FactsBucketV2>
>();

function getOrCreateBucket(
  contextRef: VerifiedLanguageContextRefV2,
  mode: LanguageLexicalModeV2,
  _execution: LocateExecutionTokenV2,
): FactsBucketV2 {
  let map = factsBuckets.get(contextRef);
  if (map === undefined) {
    map = new Map();
    factsBuckets.set(contextRef, map);
  }
  let bucket = map.get(mode);
  if (bucket === undefined) {
    bucket = {
      state: 'pending',
      carrierIssued: 0,
      kernelInvocations: 0,
    };
    map.set(mode, bucket);
  }
  return bucket;
}

export function createLanguageLexicalPreparationRefV2(
  observation: TrustedLanguageCapabilityObservationV2,
  eligibleRef: EligibleDiscoveryRefV2,
  execution: LocateExecutionTokenV2,
): LanguageLexicalPreparationRefV2 {
  const obs = requireLanguageCapabilityObservationPrivateV2(
    observation,
    execution,
  );
  const decision = obs.decisions.get(eligibleRef);
  if (decision === undefined) {
    throw new TypeError('eligible ref missing from language observation');
  }
  const ref = createOpaqueTokenV2<LanguageLexicalPreparationRefV2>();
  const privateRecord: PreparationPrivateV2 = {
    observation,
    eligibleRef,
    contextRef: decision.contextRef,
    adapter: decision.adapter,
    mode: decision.mode,
    execution,
    producerBasis: decision.producerBasis,
    role: 'unbound',
    carrier: undefined,
    proof: undefined,
  };
  preparationPrivate.set(ref, privateRecord);
  return ref;
}

function runKernel(
  mode: LanguageLexicalModeV2,
  sourceText: string,
): LexicalFactsPayloadV2 {
  const masked =
    mode === 'sql' ? maskSqlNonCode(sourceText) : maskNonCode(sourceText);
  const structure = balancedStructureV2(masked);
  return Object.freeze({
    sourceText,
    structureComplete: structure.complete,
    mode,
  });
}

/**
 * 准备 classification input：semantic 走 leader/follower；fallback 不消费 cursor。
 */
export async function prepareLanguageClassificationInputV2(
  observation: TrustedLanguageCapabilityObservationV2,
  eligibleRef: EligibleDiscoveryRefV2,
  preparation: LanguageClassificationPreparationV2,
  execution: LocateExecutionTokenV2,
): Promise<
  | VerifiedSemanticLanguageClassificationInputV2
  | VerifiedFallbackLanguageClassificationInputV2
> {
  const obs = requireLanguageCapabilityObservationPrivateV2(
    observation,
    execution,
  );
  const decision = obs.decisions.get(eligibleRef);
  if (decision === undefined) {
    throw new TypeError('eligible ref missing from language observation');
  }

  if (preparation.kind === 'fallback') {
    if (decision.adapter !== 'fallback') {
      throw new TypeError('fallback preparation requires fallback adapter');
    }
    const input =
      createOpaqueTokenV2<VerifiedFallbackLanguageClassificationInputV2>();
    fallbackInputPrivate.set(
      input,
      Object.freeze({
        observation,
        eligibleRef,
        producerBasis: decision.producerBasis,
        execution,
        matchedTermPresent: decision.matchedTermPresent,
        ...(decision.existingSymbol === undefined
          ? {}
          : { existingSymbol: decision.existingSymbol }),
      }),
    );
    return input;
  }

  if (decision.adapter === 'fallback') {
    throw new TypeError('semantic preparation requires semantic adapter');
  }
  const prep = preparationPrivate.get(preparation.preparationRef);
  if (
    prep === undefined ||
    prep.observation !== observation ||
    prep.eligibleRef !== eligibleRef ||
    prep.execution !== execution
  ) {
    throw new TypeError('language lexical preparation ref mismatch');
  }

  const bucket = getOrCreateBucket(prep.contextRef, prep.mode, execution);
  if (bucket.state === 'disposed' || bucket.state === 'failed') {
    throw new TypeError('lexical facts registry is terminal');
  }

  const wrapperPromise = (async () => {
    if (bucket.internalPromise === undefined) {
      // leader
      prep.role = 'leader';
      bucket.leaderPreparation = preparation.preparationRef;
      bucket.internalPromise = (async () => {
        void execution;
        const carrier = issueVerifiedLanguagePreparationCarrierV2({
          eligibleRef,
          contextRef: prep.contextRef,
          registeredConsumer: obs.registeredConsumer,
          expectedExecution: execution,
          sourceText: decision.sourceText,
        });
        bucket.carrierIssued += 1;
        prep.carrier = carrier;
        const proof = await consumeVerifiedLanguageContextV2({
          eligibleRef,
          contextRef: prep.contextRef,
          preparation: carrier,
          registeredConsumer: obs.registeredConsumer,
          expectedExecution: execution,
        });
        prep.proof = proof;
        bucket.kernelInvocations += 1;
        try {
          const facts = runKernel(prep.mode, decision.sourceText);
          bucket.facts = facts;
          bucket.state = 'fulfilled';
          return facts;
        } catch (error) {
          bucket.state = 'failed';
          throw error;
        }
      })();
    } else {
      // follower：复用 internal promise，不二次 issue carrier
      prep.role = 'follower';
      if (bucket.leaderPreparation !== undefined) {
        const leader = preparationPrivate.get(bucket.leaderPreparation);
        if (leader?.carrier !== undefined && leader.proof !== undefined) {
          prep.carrier = leader.carrier;
          prep.proof = leader.proof;
        }
      }
    }

    const facts = await bucket.internalPromise;
    if (prep.proof === undefined) {
      // follower 等待 leader 填 proof
      const leaderRef = bucket.leaderPreparation;
      const leader =
        leaderRef === undefined ? undefined : preparationPrivate.get(leaderRef);
      if (leader?.proof === undefined) {
        throw new TypeError('follower missing leader consumption proof');
      }
      prep.proof = leader.proof;
      prep.carrier = leader.carrier;
    }

    const input =
      createOpaqueTokenV2<VerifiedSemanticLanguageClassificationInputV2>();
    semanticInputPrivate.set(
      input,
      Object.freeze({
        observation,
        eligibleRef,
        contextRef: prep.contextRef,
        mode: prep.mode,
        preparationRef: preparation.preparationRef,
        proof: prep.proof,
        producerBasis: prep.producerBasis,
        execution,
        sourceText: facts.sourceText,
        structureComplete: facts.structureComplete,
        matchedTerms: decision.matchedTerms,
        ...(decision.anchoredSymbol === undefined
          ? {}
          : { anchoredSymbol: decision.anchoredSymbol }),
      }),
    );
    return input;
  })();

  return wrapperPromise;
}

export function requireSemanticLanguageClassificationInputV2(
  input: VerifiedSemanticLanguageClassificationInputV2,
): SemanticInputPrivateV2 {
  const record = semanticInputPrivate.get(input);
  if (record === undefined) {
    throw new TypeError('semantic language classification input untrusted');
  }
  return record;
}

export function requireFallbackLanguageClassificationInputV2(
  input: VerifiedFallbackLanguageClassificationInputV2,
): FallbackInputPrivateV2 {
  const record = fallbackInputPrivate.get(input);
  if (record === undefined) {
    throw new TypeError('fallback language classification input untrusted');
  }
  return record;
}

export function readLexicalFactsBucketProbeV2(
  contextRef: VerifiedLanguageContextRefV2,
  mode: LanguageLexicalModeV2,
  execution: LocateExecutionTokenV2,
): Readonly<{
  state: LexicalRegistryStateV2;
  carrierIssued: number;
  kernelInvocations: number;
}> {
  const bucket = getOrCreateBucket(contextRef, mode, execution);
  return Object.freeze({
    state: bucket.state,
    carrierIssued: bucket.carrierIssued,
    kernelInvocations: bucket.kernelInvocations,
  });
}

// silence unused import when adapters not yet wired in this module
void (null as unknown as RegisteredVerifiedLanguageConsumerV2);
