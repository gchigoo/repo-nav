import type {
  FinalizeLocateResultInputV2,
  LocateExecutionErrorFactsV2,
  LocateExecutionFactsV2,
  LocateExecutionNormalizedTermV2,
  LocateExecutionResolvedLimitsV2,
} from './locate-execution-facts-v2.js';
import type {
  CanonicalLocateExecutionAuthorityV2,
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
} from './locate-fact-envelope-v2.js';
import type { LocateResultV2 } from './locate-result-v2.js';

export type CanonicalLocateExecutionV2 = FinalizeLocateResultInputV2;

export interface CanonicalLocateSuccessV2 {
  readonly ok: true;
  readonly repositoryRoot: string;
  readonly normalizedTerms: readonly LocateExecutionNormalizedTermV2[];
  readonly resolvedLimits: LocateExecutionResolvedLimitsV2;
  readonly facts: LocateExecutionFactsV2;
}

export interface CanonicalLocateFailureV2 {
  readonly ok: false;
  readonly error: LocateExecutionErrorFactsV2;
}

export interface CanonicalLocateExecutionReceiptV2 {
  readonly input: CanonicalLocateExecutionV2;
  readonly authority: CanonicalLocateExecutionAuthorityV2;
}

export interface CanonicalLocateExecutorV2 {
  execute(
    request: import('../index.js').LocateRequest,
    context: import('../index.js').LocateExecutionContext,
    projectionExecution: LocateProjectionExecutionCapabilityV2,
  ): Promise<CanonicalLocateExecutionReceiptV2>;
}

export interface SerializedLocateResultV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
}

export interface LocateResultProjectorV2 {
  project(
    receipt: CanonicalLocateExecutionReceiptV2,
    execution: LocateProjectionExecutionCapabilityV2,
  ): SerializedLocateResultV2;
}

export type {
  CanonicalLocateExecutionAuthorityV2,
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
};
