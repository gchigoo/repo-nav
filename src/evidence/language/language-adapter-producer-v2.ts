/**
 * F8 always-signed language adapter producer result / source ref brands。
 */

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { EligibleDiscoveryRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { VerifiedProducerBasisReceiptsV2 } from '../request-snapshot/producer-basis-receipts-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { LanguageProducerKindV2 } from './language-adapter-kinds-v2.js';

declare const LANGUAGE_ADAPTER_PRODUCER_SOURCE_REF_V2: unique symbol;
export type LanguageAdapterProducerSourceRefV2 = Readonly<object> & {
  readonly [LANGUAGE_ADAPTER_PRODUCER_SOURCE_REF_V2]: never;
};

declare const FALLBACK_LITERAL_CANDIDATE_FACTS_V2: unique symbol;
export type FallbackLiteralCandidateFactsV2 = Readonly<object> & {
  readonly [FALLBACK_LITERAL_CANDIDATE_FACTS_V2]: never;
};

export type LanguageAdapterProducerResultV2 =
  | Readonly<{
      kind: 'supported-source';
      producerKind: LanguageProducerKindV2;
      sourceRef: LanguageAdapterProducerSourceRefV2;
    }>
  | Readonly<{
      kind: 'fallback-literal';
      producerKind: 'none';
      sourceRef: LanguageAdapterProducerSourceRefV2;
      facts: FallbackLiteralCandidateFactsV2;
    }>
  | Readonly<{
      kind: 'fallback-none';
      producerKind: 'none';
      sourceRef: LanguageAdapterProducerSourceRefV2;
    }>;

export interface LanguageAdapterSourcePrivateV2 {
  readonly producerKind: LanguageProducerKindV2;
  readonly producerBasis: VerifiedProducerBasisReceiptsV2;
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly execution: LocateExecutionTokenV2;
  readonly lane: 'supported' | 'fallback';
  readonly matchedTermPresent: boolean;
  readonly structureComplete: boolean;
  readonly definitionRole?: 'definition' | 'execution-site';
  readonly canonicalSymbol?: string;
  readonly fallbackFacts?: FallbackLiteralCandidateFactsV2;
}

const sourcePrivate = new WeakMap<
  LanguageAdapterProducerSourceRefV2,
  LanguageAdapterSourcePrivateV2
>();

const fallbackFactsPrivate = new WeakMap<
  FallbackLiteralCandidateFactsV2,
  {
    readonly eligibleRef: EligibleDiscoveryRefV2;
    readonly matchedTermPresent: true;
    readonly existingSymbol?: string;
    readonly execution: LocateExecutionTokenV2;
  }
>();

export function signLanguageAdapterSourceRefV2(
  record: LanguageAdapterSourcePrivateV2,
): LanguageAdapterProducerSourceRefV2 {
  const ref = createOpaqueTokenV2<LanguageAdapterProducerSourceRefV2>();
  sourcePrivate.set(ref, Object.freeze({ ...record }));
  return ref;
}

export function requireLanguageAdapterSourcePrivateV2(
  sourceRef: LanguageAdapterProducerSourceRefV2,
  execution: LocateExecutionTokenV2,
): LanguageAdapterSourcePrivateV2 {
  const record = sourcePrivate.get(sourceRef);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('language adapter source ref is not trusted');
  }
  return record;
}

export function signFallbackLiteralCandidateFactsV2(input: {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly existingSymbol?: string;
  readonly execution: LocateExecutionTokenV2;
}): FallbackLiteralCandidateFactsV2 {
  const facts = createOpaqueTokenV2<FallbackLiteralCandidateFactsV2>();
  fallbackFactsPrivate.set(
    facts,
    Object.freeze({
      eligibleRef: input.eligibleRef,
      matchedTermPresent: true as const,
      ...(input.existingSymbol === undefined
        ? {}
        : { existingSymbol: input.existingSymbol }),
      execution: input.execution,
    }),
  );
  return facts;
}

export function requireFallbackLiteralCandidateFactsV2(
  facts: FallbackLiteralCandidateFactsV2,
  execution: LocateExecutionTokenV2,
): {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly matchedTermPresent: true;
  readonly existingSymbol?: string;
} {
  const record = fallbackFactsPrivate.get(facts);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('fallback literal facts are not trusted');
  }
  return record;
}

export function isLanguageAdapterSourceRefV2(
  value: unknown,
): value is LanguageAdapterProducerSourceRefV2 {
  return (
    typeof value === 'object' &&
    value !== null &&
    sourcePrivate.has(value as LanguageAdapterProducerSourceRefV2)
  );
}
