import type {
  BackendHit,
  BackendSearchResult,
  SearchBackendId,
} from '../index.js';
import type { LocateExecutionTokenV2 } from './locate-fact-envelope-v2.js';

export type DistributiveOmitV2<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, Extract<keyof T, K>>
  : never;

export type BackendExecutionOutcomeV2 =
  | Readonly<{
      backend: SearchBackendId;
      status: 'used';
      completion: 'complete';
      selectionEligibility: 'complete-safe-set';
      termination: 'none';
      reasonCode?: 'CODEGRAPH_NO_RESULT' | 'RIPGREP_NO_RESULT';
      hitCount: number;
      retainedHits: readonly BackendHit[];
    }>
  | Readonly<{
      backend: SearchBackendId;
      status: 'used';
      completion: 'incomplete';
      selectionEligibility: 'telemetry-only';
      termination: 'output-limit' | 'early-stop';
      hitCount: number;
      retainedHits: readonly BackendHit[];
    }>
  | Readonly<{
      backend: SearchBackendId;
      status: 'used';
      completion: 'incomplete';
      selectionEligibility: 'telemetry-only';
      termination: 'aborted';
      reasonCode: 'BACKEND_ABORTED';
      hitCount: number;
      retainedHits: readonly BackendHit[];
    }>
  | Readonly<{
      backend: SearchBackendId;
      status: 'failed';
      completion: 'incomplete';
      selectionEligibility: 'telemetry-only';
      termination: 'timeout' | 'process-error';
      reasonCode: 'BACKEND_PROCESS_FAILED';
      hitCount: number;
      retainedHits: readonly BackendHit[];
    }>
  | Readonly<{
      backend: SearchBackendId;
      status: 'unavailable';
      completion: 'incomplete';
      selectionEligibility: 'telemetry-only';
      termination: 'none';
      reasonCode:
        | 'CODEGRAPH_INDEX_MISSING'
        | 'CODEGRAPH_UNAVAILABLE'
        | 'RIPGREP_UNAVAILABLE';
      hitCount: 0;
      retainedHits: readonly [];
    }>;

declare const VALIDATED_BACKEND_EXECUTION_OUTCOME_V2: unique symbol;
export type ValidatedBackendExecutionOutcomeV2 = Readonly<object> & {
  readonly [VALIDATED_BACKEND_EXECUTION_OUTCOME_V2]: never;
};

export type BackendExecutionOutcomeViewV2 = BackendExecutionOutcomeV2;
export type BackendExecutionTelemetryViewV2 = DistributiveOmitV2<
  BackendExecutionOutcomeV2,
  'retainedHits' | 'selectionEligibility'
>;

declare const BACKEND_EXECUTION_CONTEXT_V2: unique symbol;
export type BackendExecutionContextV2 = Readonly<object> & {
  readonly [BACKEND_EXECUTION_CONTEXT_V2]: never;
};

declare const TRUSTED_BACKEND_DISCOVERY_HANDOFF_V2: unique symbol;
export type TrustedBackendDiscoveryHandoffV2 = Readonly<object> & {
  readonly [TRUSTED_BACKEND_DISCOVERY_HANDOFF_V2]: never;
};

declare const BACKEND_NO_START_DECISION_V2: unique symbol;
export type BackendNoStartDecisionV2 = Readonly<object> & {
  readonly [BACKEND_NO_START_DECISION_V2]: never;
};

declare const BACKEND_NO_START_OBSERVATION_V2: unique symbol;
export type BackendNoStartObservationV2 = Readonly<object> & {
  readonly [BACKEND_NO_START_OBSERVATION_V2]: never;
};

declare const EXPANDED_BACKEND_LOGICAL_ATTEMPT_V2: unique symbol;
export type ExpandedBackendLogicalAttemptV2 = Readonly<object> & {
  readonly [EXPANDED_BACKEND_LOGICAL_ATTEMPT_V2]: never;
};

declare const BACKEND_EXECUTION_TRACE_V2: unique symbol;
export type BackendExecutionTraceV2 = Readonly<object> & {
  readonly [BACKEND_EXECUTION_TRACE_V2]: never;
};

declare const TRUSTED_CODEGRAPH_INDEX_OBSERVATION_V2: unique symbol;
export type TrustedCodeGraphIndexObservationV2 = Readonly<object> & {
  readonly [TRUSTED_CODEGRAPH_INDEX_OBSERVATION_V2]: never;
};

declare const CODEGRAPH_PROBE_RECEIPT_V2: unique symbol;
export type CodeGraphProbeReceiptV2 = Readonly<object> & {
  readonly [CODEGRAPH_PROBE_RECEIPT_V2]: never;
};

export type CodeGraphIndexObservationV2 =
  | Readonly<{ kind: 'not-observed' }>
  | Readonly<{ kind: 'available'; possiblyStale: boolean }>
  | Readonly<{ kind: 'missing-index' }>
  | Readonly<{ kind: 'tool-unavailable' }>
  | Readonly<{ kind: 'error' }>;

export interface CompleteSafeBackendHitForF3V2 {
  readonly hit: BackendHit;
  readonly querySeedKeys: readonly string[];
  readonly matchedAnchorKeys: readonly string[];
}

export interface BackendFallbackFactsForF3V2 {
  readonly primaryNeededFallback: boolean;
  readonly fallbackInvoked: boolean;
  readonly fallbackAcceptedForExpanded: boolean;
  readonly fallbackAcceptedForLegacy: boolean;
}

export interface BackendDiscoveryHandoffCommonForF3V2 {
  readonly backend: SearchBackendId;
  readonly legacy: BackendSearchResult;
  readonly legacyCap: number;
  readonly fallback: BackendFallbackFactsForF3V2;
}

export type BackendDiscoveryHandoffForF3ViewV2 =
  | (BackendDiscoveryHandoffCommonForF3V2 &
      Readonly<{
        kind: 'started';
        expandedOutcome: ValidatedBackendExecutionOutcomeV2;
        expandedHealth: BackendSearchResult['health'];
        expandedComplete: boolean;
        completeSafeHits: readonly CompleteSafeBackendHitForF3V2[];
        canSkipFallbackIfVerified: boolean;
      }>)
  | (BackendDiscoveryHandoffCommonForF3V2 &
      Readonly<{
        kind: 'no-start';
        reason: 'availability-preparation-failed' | 'pre-aborted';
        expandedHealth: BackendSearchResult['health'];
        expandedComplete: false;
        completeSafeHits: readonly [];
        canSkipFallbackIfVerified: false;
      }>);

export interface BackendExecutionTraceViewV2 {
  readonly outcomes: readonly BackendExecutionTelemetryViewV2[];
  readonly firstExpandedStartOrdinals: readonly number[];
  readonly codegraphIndexObservation: CodeGraphIndexObservationV2;
}

export interface ExpandedBackendLogicalAttemptViewV2 {
  readonly backend: SearchBackendId;
  readonly firstExpandedStartOrdinal: number;
  readonly outcome: ValidatedBackendExecutionOutcomeV2;
}

/** 供 type-test 证明 DistributiveOmit 逐 member 去除内部字段。 */
export type BackendAttemptV2ShapeProbe = BackendExecutionTelemetryViewV2;

export type LocateExecutionTokenForBackendV2 = LocateExecutionTokenV2;
