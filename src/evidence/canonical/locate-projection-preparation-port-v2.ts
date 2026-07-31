/**
 * F1C-owned neutral three-stage preparation port interface and opaque stage tokens.
 * No default or real provider lives under src/**.
 */

import type {
  CanonicalLocateExecutionV2,
  LocateExecutionTokenV2,
  LocateFactPayloadsV2,
  PublicSearchTermV2,
  TrustedLocateProjectionPrerequisitesV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type {
  CandidateEvidenceV2,
  ConfirmedEvidenceV2,
} from '../../contracts/v2/locate-result-v2.js';
import { LOCATE_STATUSES_V2 } from '../../contracts/v2/locate-result-v2.js';

type AggregationStatusV2 = (typeof LOCATE_STATUSES_V2)[number];

declare const TRUSTED_LOCATE_PROJECTION_SOURCE_V2: unique symbol;
export type TrustedLocateProjectionSourceV2 = Readonly<{
  readonly [TRUSTED_LOCATE_PROJECTION_SOURCE_V2]: never;
}>;

declare const TRUSTED_LOCATE_PROJECTION_MATERIALIZATION_V2: unique symbol;
export type TrustedLocateProjectionMaterializationV2 = Readonly<{
  readonly [TRUSTED_LOCATE_PROJECTION_MATERIALIZATION_V2]: never;
}>;

declare const TRUSTED_LOCATE_PROJECTION_AGGREGATION_V2: unique symbol;
export type TrustedLocateProjectionAggregationV2 = Readonly<{
  readonly [TRUSTED_LOCATE_PROJECTION_AGGREGATION_V2]: never;
}>;

export type LocateProjectionPreparationFailureV2 = Readonly<{
  ok: false;
  reason: 'invalid-facts';
}>;

export type LocateProjectionStageRegistrationResultV2<TValue> = Readonly<
  { ok: true; value: TValue } | LocateProjectionPreparationFailureV2
>;

export interface LocateProjectionSourceRegistrationV2 {
  readonly identity: Readonly<object>;
}

export interface LocateProjectionMaterializedConfirmedRegistrationV2 {
  readonly identity: Readonly<object>;
  readonly value: Readonly<Omit<ConfirmedEvidenceV2, 'id'>>;
}

export interface LocateProjectionMaterializedCandidateRegistrationV2 {
  readonly identity: Readonly<object>;
  readonly value: Readonly<Omit<CandidateEvidenceV2, 'id'>>;
}

export interface LocateProjectionMaterializationRegistrationV2 {
  readonly normalizedTerms: readonly PublicSearchTermV2[];
  readonly confirmed: readonly LocateProjectionMaterializedConfirmedRegistrationV2[];
  readonly candidates: readonly LocateProjectionMaterializedCandidateRegistrationV2[];
}

export interface LocateProjectionAggregationRegistrationV2 {
  readonly identity: Readonly<object>;
  readonly statusV2: AggregationStatusV2;
  readonly backend: Readonly<LocateFactPayloadsV2['backend']>;
  readonly requestOutcome: Readonly<LocateFactPayloadsV2['request-outcome']>;
}

export interface LocateProjectionPreparationPortV2 {
  createSource(
    prerequisites: TrustedLocateProjectionPrerequisitesV2,
    input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
    execution: LocateExecutionTokenV2,
  ): Readonly<
    | { ok: true; value: TrustedLocateProjectionSourceV2 }
    | LocateProjectionPreparationFailureV2
  >;
  materialize(
    source: TrustedLocateProjectionSourceV2,
    input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
    execution: LocateExecutionTokenV2,
  ): Readonly<
    | { ok: true; value: TrustedLocateProjectionMaterializationV2 }
    | LocateProjectionPreparationFailureV2
  >;
  aggregate(
    materialization: TrustedLocateProjectionMaterializationV2,
    input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
    execution: LocateExecutionTokenV2,
  ): Readonly<
    | { ok: true; value: TrustedLocateProjectionAggregationV2 }
    | LocateProjectionPreparationFailureV2
  >;
}
