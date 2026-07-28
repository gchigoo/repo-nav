import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type { EligibleDiscoveryRefV2 } from './pre-ranking-evidence-pool-v2.js';
import type { VerifiedCandidateTokenProposalV2 } from './candidate-token-proposal-enumerator-v2.js';
import { readCandidateTokenProposalFactsV2 } from './candidate-token-proposal-enumerator-v2.js';

declare const VERIFIED_PRODUCER_BASIS_RECEIPT_V2: unique symbol;
declare const DERIVED_EVIDENCE_PROPOSAL_REF_V2: unique symbol;

export type VerifiedProducerBasisReceiptV2 = Readonly<object> & {
  readonly [VERIFIED_PRODUCER_BASIS_RECEIPT_V2]: never;
};

export type DerivedEvidenceProposalRefV2 = Readonly<object> & {
  readonly [DERIVED_EVIDENCE_PROPOSAL_REF_V2]: never;
};

export interface VerifiedProducerBasisReceiptsV2 {
  readonly basis: VerifiedProducerBasisReceiptV2;
  readonly source: VerifiedProducerBasisReceiptV2;
}

export interface VerifiedScopeBoundProducerBasisViewV2 {
  readonly subject: 'record' | 'derived-proposal';
  readonly locationFile: string;
  readonly locationLines: readonly [number, number];
  readonly symbol?: string;
}

interface BasisPrivateV2 {
  readonly subject: 'record' | 'derived-proposal';
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly execution: LocateExecutionTokenV2;
  readonly locationFile: string;
  readonly locationLines: readonly [number, number];
  readonly symbol?: string;
}

interface ProposalRefPrivateV2 {
  readonly seedEligibleRef: EligibleDiscoveryRefV2;
  readonly proposal: VerifiedCandidateTokenProposalV2;
  readonly execution: LocateExecutionTokenV2;
  readonly locationFile: string;
  readonly locationLines: readonly [number, number];
  readonly symbol: string;
}

const basisPrivate = new WeakMap<
  VerifiedProducerBasisReceiptV2,
  BasisPrivateV2
>();
const proposalRefPrivate = new WeakMap<
  DerivedEvidenceProposalRefV2,
  ProposalRefPrivateV2
>();
const receiptsBundlePrivate = new WeakMap<
  VerifiedProducerBasisReceiptsV2,
  BasisPrivateV2
>();

/**
 * Direct record basis receipts。
 */
export function requirePreFinalProducerBasisReceiptsV2(input: {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly locationFile: string;
  readonly locationLines: readonly [number, number];
  readonly execution: LocateExecutionTokenV2;
}): VerifiedProducerBasisReceiptsV2 {
  const basis = createOpaqueTokenV2<VerifiedProducerBasisReceiptV2>();
  const source = createOpaqueTokenV2<VerifiedProducerBasisReceiptV2>();
  const privateRecord: BasisPrivateV2 = Object.freeze({
    subject: 'record' as const,
    eligibleRef: input.eligibleRef,
    execution: input.execution,
    locationFile: input.locationFile,
    locationLines: input.locationLines,
  });
  basisPrivate.set(basis, privateRecord);
  basisPrivate.set(source, privateRecord);
  const bundle = Object.freeze({ basis, source });
  receiptsBundlePrivate.set(bundle, privateRecord);
  return bundle;
}

/**
 * Derived proposal ref：绑定 proposal location，不得复用 seed location。
 */
export function registerDerivedEvidenceProposalRefV2(input: {
  readonly seedEligibleRef: EligibleDiscoveryRefV2;
  readonly proposal: VerifiedCandidateTokenProposalV2;
  readonly execution: LocateExecutionTokenV2;
}): DerivedEvidenceProposalRefV2 {
  const facts = readCandidateTokenProposalFactsV2(input.proposal);
  const ref = createOpaqueTokenV2<DerivedEvidenceProposalRefV2>();
  proposalRefPrivate.set(
    ref,
    Object.freeze({
      seedEligibleRef: input.seedEligibleRef,
      proposal: input.proposal,
      execution: input.execution,
      locationFile: facts.file,
      locationLines: Object.freeze([facts.line, facts.line] as [number, number]),
      symbol: facts.tokenValue,
    }),
  );
  return ref;
}

export function requirePreFinalDerivedProducerBasisReceiptsV2(input: {
  readonly proposalRef: DerivedEvidenceProposalRefV2;
  readonly execution: LocateExecutionTokenV2;
}): VerifiedProducerBasisReceiptsV2 {
  const privateRecord = proposalRefPrivate.get(input.proposalRef);
  if (
    privateRecord === undefined ||
    privateRecord.execution !== input.execution
  ) {
    throw new TypeError('derived proposal ref is not trusted');
  }
  const basis = createOpaqueTokenV2<VerifiedProducerBasisReceiptV2>();
  const source = createOpaqueTokenV2<VerifiedProducerBasisReceiptV2>();
  const record: BasisPrivateV2 = Object.freeze({
    subject: 'derived-proposal' as const,
    eligibleRef: privateRecord.seedEligibleRef,
    execution: input.execution,
    locationFile: privateRecord.locationFile,
    locationLines: privateRecord.locationLines,
    symbol: privateRecord.symbol,
  });
  basisPrivate.set(basis, record);
  basisPrivate.set(source, record);
  const bundle = Object.freeze({ basis, source });
  receiptsBundlePrivate.set(bundle, record);
  return bundle;
}

/**
 * F7 verifier：按 subject 返回 exact location；seed 不能冒充 proposal。
 */
export function requireScopeBoundProducerBasisV2(
  receipts: VerifiedProducerBasisReceiptsV2,
  execution: LocateExecutionTokenV2,
): VerifiedScopeBoundProducerBasisViewV2 {
  const record = receiptsBundlePrivate.get(receipts);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('producer basis receipts are not trusted');
  }
  return Object.freeze({
    subject: record.subject,
    locationFile: record.locationFile,
    locationLines: record.locationLines,
    ...(record.symbol !== undefined ? { symbol: record.symbol } : {}),
  });
}
