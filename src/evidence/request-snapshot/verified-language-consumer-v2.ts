import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type { EligibleDiscoveryRefV2 } from './pre-ranking-evidence-pool-v2.js';

declare const VERIFIED_LANGUAGE_CONSUMER_ADMISSION_V2: unique symbol;
declare const REGISTERED_VERIFIED_LANGUAGE_CONSUMER_V2: unique symbol;
declare const VERIFIED_LANGUAGE_PREPARATION_CARRIER_V2: unique symbol;
declare const VERIFIED_LANGUAGE_CONTEXT_REF_V2: unique symbol;
declare const VERIFIED_LANGUAGE_CONTEXT_CONSUMPTION_PROOF_V2: unique symbol;

export type VerifiedLanguageConsumerOwnerV2 =
  'request-snapshot-baseline' | 'language-capability';

export type VerifiedLanguageConsumerAdmissionV2 = Readonly<object> & {
  readonly [VERIFIED_LANGUAGE_CONSUMER_ADMISSION_V2]: never;
};

export type RegisteredVerifiedLanguageConsumerV2 = Readonly<object> & {
  readonly [REGISTERED_VERIFIED_LANGUAGE_CONSUMER_V2]: never;
};

export type VerifiedLanguagePreparationCarrierV2 = Readonly<object> & {
  readonly [VERIFIED_LANGUAGE_PREPARATION_CARRIER_V2]: never;
};

export type VerifiedLanguageContextRefV2 = Readonly<object> & {
  readonly [VERIFIED_LANGUAGE_CONTEXT_REF_V2]: never;
};

export type VerifiedLanguageContextConsumptionProofV2 = Readonly<object> & {
  readonly [VERIFIED_LANGUAGE_CONTEXT_CONSUMPTION_PROOF_V2]: never;
};

export interface EphemeralVerifiedLanguageSourceCursorV2 {
  readonly codeUnitLength: number;
  codeUnitAt(index: number): number;
}

export interface VerifiedLanguageCursorConsumerV2 {
  consumeVerifiedContext(
    contextRef: VerifiedLanguageContextRefV2,
    preparation: VerifiedLanguagePreparationCarrierV2,
    source: EphemeralVerifiedLanguageSourceCursorV2,
    execution: LocateExecutionTokenV2,
  ): Promise<void>;
}

interface AdmissionPrivateV2 {
  readonly owner: VerifiedLanguageConsumerOwnerV2;
  readonly execution: LocateExecutionTokenV2;
}

interface RegisteredPrivateV2 {
  readonly admission: VerifiedLanguageConsumerAdmissionV2;
  readonly consumer: VerifiedLanguageCursorConsumerV2;
  readonly execution: LocateExecutionTokenV2;
}

interface CarrierPrivateV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly contextRef: VerifiedLanguageContextRefV2;
  readonly registeredConsumer: RegisteredVerifiedLanguageConsumerV2;
  readonly execution: LocateExecutionTokenV2;
  readonly sourceText: string;
  consumed: boolean;
}

const admissionPrivate = new WeakMap<
  VerifiedLanguageConsumerAdmissionV2,
  AdmissionPrivateV2
>();
const registeredPrivate = new WeakMap<
  RegisteredVerifiedLanguageConsumerV2,
  RegisteredPrivateV2
>();
const carrierPrivate = new WeakMap<
  VerifiedLanguagePreparationCarrierV2,
  CarrierPrivateV2
>();

/**
 * F3-owned admission：base 只登记 request-snapshot-baseline 或 neutral language-capability。
 */
export function createVerifiedLanguageConsumerAdmissionV2(
  owner: VerifiedLanguageConsumerOwnerV2,
  execution: LocateExecutionTokenV2,
): VerifiedLanguageConsumerAdmissionV2 {
  if (
    owner !== 'request-snapshot-baseline' &&
    owner !== 'language-capability'
  ) {
    throw new TypeError('unsupported language consumer owner');
  }
  const admission = createOpaqueTokenV2<VerifiedLanguageConsumerAdmissionV2>();
  admissionPrivate.set(admission, Object.freeze({ owner, execution }));
  return admission;
}

export function registerVerifiedLanguageConsumerV2(
  admission: VerifiedLanguageConsumerAdmissionV2,
  consumer: VerifiedLanguageCursorConsumerV2,
  execution: LocateExecutionTokenV2,
): RegisteredVerifiedLanguageConsumerV2 {
  const record = admissionPrivate.get(admission);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('language consumer admission mismatch');
  }
  const registered =
    createOpaqueTokenV2<RegisteredVerifiedLanguageConsumerV2>();
  registeredPrivate.set(
    registered,
    Object.freeze({ admission, consumer, execution }),
  );
  return registered;
}

export function createVerifiedLanguageContextRefV2(): VerifiedLanguageContextRefV2 {
  return createOpaqueTokenV2<VerifiedLanguageContextRefV2>();
}

/**
 * One-shot carrier：绑定 exact view/ref/consumer/execution。
 */
export function issueVerifiedLanguagePreparationCarrierV2(input: {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly contextRef: VerifiedLanguageContextRefV2;
  readonly registeredConsumer: RegisteredVerifiedLanguageConsumerV2;
  readonly expectedExecution: LocateExecutionTokenV2;
  readonly sourceText: string;
}): VerifiedLanguagePreparationCarrierV2 {
  const registered = registeredPrivate.get(input.registeredConsumer);
  if (
    registered === undefined ||
    registered.execution !== input.expectedExecution
  ) {
    throw new TypeError('registered language consumer mismatch');
  }
  const carrier = createOpaqueTokenV2<VerifiedLanguagePreparationCarrierV2>();
  carrierPrivate.set(carrier, {
    eligibleRef: input.eligibleRef,
    contextRef: input.contextRef,
    registeredConsumer: input.registeredConsumer,
    execution: input.expectedExecution,
    sourceText: input.sourceText,
    consumed: false,
  });
  return carrier;
}

/**
 * 消费 carrier 一次；cursor 仅在 callback 动态范围内有效。
 */
export async function consumeVerifiedLanguageContextV2(input: {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly contextRef: VerifiedLanguageContextRefV2;
  readonly preparation: VerifiedLanguagePreparationCarrierV2;
  readonly registeredConsumer: RegisteredVerifiedLanguageConsumerV2;
  readonly expectedExecution: LocateExecutionTokenV2;
}): Promise<VerifiedLanguageContextConsumptionProofV2> {
  const carrier = carrierPrivate.get(input.preparation);
  const registered = registeredPrivate.get(input.registeredConsumer);
  if (
    carrier === undefined ||
    registered === undefined ||
    carrier.consumed ||
    carrier.execution !== input.expectedExecution ||
    carrier.registeredConsumer !== input.registeredConsumer ||
    carrier.eligibleRef !== input.eligibleRef ||
    carrier.contextRef !== input.contextRef
  ) {
    throw new TypeError('language carrier consumption rejected');
  }
  carrier.consumed = true;

  let cursorAlive = true;
  const sourceText = carrier.sourceText;
  const cursor: EphemeralVerifiedLanguageSourceCursorV2 = {
    get codeUnitLength(): number {
      if (!cursorAlive) {
        throw new TypeError('language cursor settled');
      }
      return sourceText.length;
    },
    codeUnitAt(index: number): number {
      if (!cursorAlive) {
        throw new TypeError('language cursor settled');
      }
      return sourceText.charCodeAt(index);
    },
  };

  await registered.consumer.consumeVerifiedContext(
    input.contextRef,
    input.preparation,
    cursor,
    input.expectedExecution,
  );
  cursorAlive = false;
  return createOpaqueTokenV2<VerifiedLanguageContextConsumptionProofV2>();
}
