/**
 * F8 accepted complete real locate shadow orchestrator。
 * F9 前 production transport 不可达；EvidenceModule 唯一 non-exported provider。
 */

import type {
  CanonicalLocateExecutionV2,
  LocateExecutionTokenV2,
  LocateProjectionExecutionCapabilityV2,
  TrustedLocateProjectionPrerequisitesV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import { inspectLocateProjectionPrerequisiteOwnersV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { LocateResultV2 } from '../../contracts/v2/locate-result-v2.js';
import { requireCanonicalLocateExecutionTokenV2 } from '../locate-execution/locate-projection-execution-capability-v2.js';
import {
  createF2LocateProjectionStagesV2,
  requireF2MaterializedEvidenceCoreV2,
  type F2LocateProjectionStagesV2,
} from '../public-output/f2-locate-projection-stages-v2.js';
import { readTrustedMaterializedEvidenceSummaryV2 } from '../public-output/materialized-evidence-core-v2.js';
import {
  aggregateRequestOutcomeV2,
  type RequestOutcomeAggregationInputV2,
} from '../request-outcome/request-outcome-aggregator-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type {
  TrustedLocateProjectionAggregationV2,
  TrustedLocateProjectionMaterializationV2,
  TrustedLocateProjectionSourceV2,
} from './locate-projection-preparation-port-v2.js';
import { registerTrustedLocateProjectionAggregationV2 } from './locate-projection-stage-registrar-v2.js';
import { requireTrustedLocateProjectionMaterializationEntryV2 } from './locate-projection-stage-registrar-v2.js';
import { createMaterializedLocateResultComposerV2 } from './materialized-locate-result-composer-v2.js';
import { createRequiredOwnerFinalizerV2 } from './required-owner-finalizer-v2.js';
import type { TrustedFinalizedLocateFactsV2 } from './required-owner-finalizer-v2.js';
import type { TrustedMaterializedLocateResultV2 } from './materialized-locate-result-composer-v2.js';
import {
  requireTrustedSerializedLocateResultV2,
  serializeTrustedMaterializedLocateResultV2,
  validateComposedLocateResultV2ForSerialization,
  type TrustedSchemaValidatedLocateResultV2,
  type TrustedSerializedLocateResultV2,
} from './trusted-serialized-locate-result-v2.js';

/** Aggregation 输入（不含 materialization；由 F2 core accessor 恢复）。 */
export type AcceptedCompleteRealAggregationBundleV2 = Omit<
  RequestOutcomeAggregationInputV2,
  'materialization' | 'contributions'
> & {
  readonly contributions: readonly [
    RequestOutcomeAggregationInputV2['contributions'][1],
    RequestOutcomeAggregationInputV2['contributions'][2],
    RequestOutcomeAggregationInputV2['contributions'][3],
  ];
};

const aggregationBundleByExecution = new WeakMap<
  LocateExecutionTokenV2,
  AcceptedCompleteRealAggregationBundleV2
>();

/**
 * 登记同 execution 的 F6 aggregation bundle（production / real-shadow harness）。
 */
export function registerAcceptedCompleteRealAggregationBundleV2(
  execution: LocateExecutionTokenV2,
  bundle: AcceptedCompleteRealAggregationBundleV2,
): void {
  aggregationBundleByExecution.set(execution, bundle);
}

export const ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2 = Symbol(
  'ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_ORCHESTRATOR_V2',
);

export const COMPLETE_REAL_LOCATE_SHADOW_STAGE_ORDER_V2 = Object.freeze([
  'source',
  'materialization',
  'aggregation',
  'owner-finalization',
  'composition',
  'schema',
  'serialization-budget',
] as const);

export type CompleteRealLocateShadowStageV2 =
  (typeof COMPLETE_REAL_LOCATE_SHADOW_STAGE_ORDER_V2)[number];

export type CompleteRealLocateShadowFailureCodeV2 =
  | 'SOURCE_INVALID'
  | 'MATERIALIZATION_INVALID'
  | 'AGGREGATION_INVALID'
  | 'OWNER_FINALIZATION_INVALID'
  | 'COMPOSITION_INVALID'
  | 'SCHEMA_INVALID'
  | 'SERIALIZATION_BUDGET_EXCEEDED';

export interface CompleteRealLocateShadowStageContextV2 {
  readonly input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>;
  readonly projectionExecution: LocateProjectionExecutionCapabilityV2;
  readonly execution: LocateExecutionTokenV2;
  readonly prerequisites: TrustedLocateProjectionPrerequisitesV2;
}

type StageResultV2<TValue, TCode extends CompleteRealLocateShadowFailureCodeV2> =
  | Readonly<{ ok: true; value: TValue }>
  | Readonly<{ ok: false; code: TCode }>;

declare const ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_V2: unique symbol;
export type AcceptedCompleteRealLocateShadowV2 = Readonly<{
  readonly [ACCEPTED_COMPLETE_REAL_LOCATE_SHADOW_V2]: never;
}>;

declare const COMPLETE_REAL_LOCATE_SHADOW_FAILURE_V2: unique symbol;
export type CompleteRealLocateShadowFailureV2 = Readonly<{
  readonly [COMPLETE_REAL_LOCATE_SHADOW_FAILURE_V2]: never;
}>;

export type AcceptedCompleteRealLocateShadowAttemptV2 =
  | Readonly<{
      ok: true;
      accepted: AcceptedCompleteRealLocateShadowV2;
    }>
  | Readonly<{
      ok: false;
      failure: CompleteRealLocateShadowFailureV2;
    }>;

export interface AcceptedCompleteRealLocateShadowViewV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
  readonly serialized: TrustedSerializedLocateResultV2;
}

export interface AcceptedCompleteRealLocateShadowOrchestratorV2 {
  projectAcceptedExecution(
    input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
    execution: LocateProjectionExecutionCapabilityV2,
  ): AcceptedCompleteRealLocateShadowAttemptV2;
}

type StageCountersV2 = Readonly<Record<CompleteRealLocateShadowStageV2, 0 | 1>>;

interface AcceptedPrivateV2 {
  readonly input: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>;
  readonly capability: LocateProjectionExecutionCapabilityV2;
  readonly execution: LocateExecutionTokenV2;
  readonly serialized: TrustedSerializedLocateResultV2;
  readonly counters: StageCountersV2;
}

interface FailurePrivateV2 {
  readonly terminalStage: CompleteRealLocateShadowStageV2;
  readonly code: CompleteRealLocateShadowFailureCodeV2;
  readonly counters: StageCountersV2;
}

const acceptedPrivate = new WeakMap<
  AcceptedCompleteRealLocateShadowV2,
  AcceptedPrivateV2
>();
const failurePrivate = new WeakMap<
  CompleteRealLocateShadowFailureV2,
  FailurePrivateV2
>();

/** 测试可注入 aggregation runner（production 闭包默认路径）。 */
let aggregationRunnerForTest:
  | ((
      materialization: TrustedLocateProjectionMaterializationV2,
      context: CompleteRealLocateShadowStageContextV2,
    ) => StageResultV2<
      TrustedLocateProjectionAggregationV2,
      'AGGREGATION_INVALID'
    >)
  | undefined;

export function setAcceptedCompleteRealAggregationRunnerForTestV2(
  runner:
    | ((
        materialization: TrustedLocateProjectionMaterializationV2,
        context: CompleteRealLocateShadowStageContextV2,
      ) => StageResultV2<
        TrustedLocateProjectionAggregationV2,
        'AGGREGATION_INVALID'
      >)
    | undefined,
): void {
  aggregationRunnerForTest = runner;
}

function zeroCounters(): Record<CompleteRealLocateShadowStageV2, 0 | 1> {
  return {
    source: 0,
    materialization: 0,
    aggregation: 0,
    'owner-finalization': 0,
    composition: 0,
    schema: 0,
    'serialization-budget': 0,
  };
}

function failAttempt(
  terminalStage: CompleteRealLocateShadowStageV2,
  code: CompleteRealLocateShadowFailureCodeV2,
  counters: Record<CompleteRealLocateShadowStageV2, 0 | 1>,
): AcceptedCompleteRealLocateShadowAttemptV2 {
  const failure = createOpaqueTokenV2<CompleteRealLocateShadowFailureV2>();
  failurePrivate.set(
    failure,
    Object.freeze({
      terminalStage,
      code,
      counters: Object.freeze({ ...counters }),
    }),
  );
  return Object.freeze({ ok: false, failure });
}

/**
 * Zero-argument factory：exact-once F2 + 两个 F1C acquisition。
 */
export function createAcceptedCompleteRealLocateShadowOrchestratorV2(): AcceptedCompleteRealLocateShadowOrchestratorV2 {
  const f2Stages: F2LocateProjectionStagesV2 = createF2LocateProjectionStagesV2();
  const finalizer = createRequiredOwnerFinalizerV2();
  const composer = createMaterializedLocateResultComposerV2();

  function runAcceptedCompleteRealLocateSourceV2(
    context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<TrustedLocateProjectionSourceV2, 'SOURCE_INVALID'> {
    const result = f2Stages.createSource(
      context.prerequisites,
      context.input,
      context.execution,
    );
    if (!result.ok) {
      return Object.freeze({ ok: false, code: 'SOURCE_INVALID' as const });
    }
    return Object.freeze({ ok: true, value: result.value });
  }

  function runAcceptedCompleteRealLocateMaterializationV2(
    source: TrustedLocateProjectionSourceV2,
    context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<
    TrustedLocateProjectionMaterializationV2,
    'MATERIALIZATION_INVALID'
  > {
    const result = f2Stages.materialize(
      source,
      context.input,
      context.execution,
    );
    if (!result.ok) {
      return Object.freeze({
        ok: false,
        code: 'MATERIALIZATION_INVALID' as const,
      });
    }
    return Object.freeze({ ok: true, value: result.value });
  }

  function runAcceptedCompleteRealLocateAggregationV2(
    materialization: TrustedLocateProjectionMaterializationV2,
    context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<
    TrustedLocateProjectionAggregationV2,
    'AGGREGATION_INVALID'
  > {
    if (aggregationRunnerForTest !== undefined) {
      return aggregationRunnerForTest(materialization, context);
    }
    try {
      const core = requireF2MaterializedEvidenceCoreV2(
        materialization,
        context.input,
        context.execution,
      );
      const bundle = aggregationBundleByExecution.get(context.execution);
      if (bundle === undefined) {
        return Object.freeze({
          ok: false,
          code: 'AGGREGATION_INVALID' as const,
        });
      }
      const summary = readTrustedMaterializedEvidenceSummaryV2(
        core,
        context.execution,
      );
      const aggregated = aggregateRequestOutcomeV2(
        Object.freeze({
          execution: bundle.execution,
          backendTrace: bundle.backendTrace,
          fallback: bundle.fallback,
          ranking: bundle.ranking,
          snapshotProof: bundle.snapshotProof,
          materialization: core,
          resolvedLimits: bundle.resolvedLimits,
          abortDecision: bundle.abortDecision,
          abortCoordinator: bundle.abortCoordinator,
          contributions: Object.freeze([
            summary.contribution,
            bundle.contributions[0],
            bundle.contributions[1],
            bundle.contributions[2],
          ] as const),
          scopeProof: bundle.scopeProof,
          expectedEligiblePool: bundle.expectedEligiblePool,
          expectedFoldProof: bundle.expectedFoldProof,
          expectedCoverageBasis: bundle.expectedCoverageBasis,
          expectedResolvedScope: bundle.expectedResolvedScope,
          expectedCapabilityFacts: bundle.expectedCapabilityFacts,
        }),
      );
      const materializationEntry =
        requireTrustedLocateProjectionMaterializationEntryV2(
          materialization,
          context.execution,
        );
      const registration = registerTrustedLocateProjectionAggregationV2(
        Object.freeze({
          identity: materializationEntry.identity,
          statusV2: aggregated.statusV2,
          backend: aggregated.backend.value,
          requestOutcome: aggregated.requestOutcome.value,
        }),
        materialization,
        context.input,
        context.execution,
      );
      if (!registration.ok) {
        return Object.freeze({
          ok: false,
          code: 'AGGREGATION_INVALID' as const,
        });
      }
      return Object.freeze({ ok: true, value: registration.value });
    } catch {
      return Object.freeze({ ok: false, code: 'AGGREGATION_INVALID' as const });
    }
  }

  function runAcceptedCompleteRealLocateOwnerFinalizationV2(
    aggregation: TrustedLocateProjectionAggregationV2,
    context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<TrustedFinalizedLocateFactsV2, 'OWNER_FINALIZATION_INVALID'> {
    const result = finalizer.finalize(aggregation, context.execution);
    if (!result.ok) {
      return Object.freeze({
        ok: false,
        code: 'OWNER_FINALIZATION_INVALID' as const,
      });
    }
    return Object.freeze({ ok: true, value: result.value });
  }

  function runAcceptedCompleteRealLocateCompositionV2(
    finalized: TrustedFinalizedLocateFactsV2,
    _context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<TrustedMaterializedLocateResultV2, 'COMPOSITION_INVALID'> {
    void _context;
    const result = composer.compose(finalized);
    if (!result.ok) {
      return Object.freeze({ ok: false, code: 'COMPOSITION_INVALID' as const });
    }
    return Object.freeze({ ok: true, value: result.value });
  }

  function runAcceptedCompleteRealLocateSchemaV2(
    materialized: TrustedMaterializedLocateResultV2,
    _context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<TrustedSchemaValidatedLocateResultV2, 'SCHEMA_INVALID'> {
    void _context;
    try {
      const value = validateComposedLocateResultV2ForSerialization(materialized);
      return Object.freeze({ ok: true, value });
    } catch {
      return Object.freeze({ ok: false, code: 'SCHEMA_INVALID' as const });
    }
  }

  function runAcceptedCompleteRealLocateSerializationBudgetV2(
    validated: TrustedSchemaValidatedLocateResultV2,
    context: CompleteRealLocateShadowStageContextV2,
  ): StageResultV2<
    TrustedSerializedLocateResultV2,
    'SERIALIZATION_BUDGET_EXCEEDED'
  > {
    try {
      const value = serializeTrustedMaterializedLocateResultV2(
        validated,
        context.projectionExecution,
      );
      return Object.freeze({ ok: true, value });
    } catch {
      return Object.freeze({
        ok: false,
        code: 'SERIALIZATION_BUDGET_EXCEEDED' as const,
      });
    }
  }

  const orchestrator: AcceptedCompleteRealLocateShadowOrchestratorV2 = {
    projectAcceptedExecution(input, capability) {
      const counters = zeroCounters();
      let token: LocateExecutionTokenV2;
      try {
        token = requireCanonicalLocateExecutionTokenV2(input, capability);
      } catch {
        return failAttempt('source', 'SOURCE_INVALID', counters);
      }
      const prerequisites = inspectLocateProjectionPrerequisiteOwnersV2(
        input.envelope,
        input,
        token,
      );
      if (!prerequisites.ok) {
        return failAttempt('source', 'SOURCE_INVALID', counters);
      }
      const context: CompleteRealLocateShadowStageContextV2 = Object.freeze({
        input,
        projectionExecution: capability,
        execution: token,
        prerequisites: prerequisites.prerequisites,
      });

      const source = runAcceptedCompleteRealLocateSourceV2(context);
      counters.source = 1;
      if (!source.ok) {
        return failAttempt('source', source.code, counters);
      }

      const materialization = runAcceptedCompleteRealLocateMaterializationV2(
        source.value,
        context,
      );
      counters.materialization = 1;
      if (!materialization.ok) {
        return failAttempt('materialization', materialization.code, counters);
      }

      const aggregation = runAcceptedCompleteRealLocateAggregationV2(
        materialization.value,
        context,
      );
      counters.aggregation = 1;
      if (!aggregation.ok) {
        return failAttempt('aggregation', aggregation.code, counters);
      }

      const finalized = runAcceptedCompleteRealLocateOwnerFinalizationV2(
        aggregation.value,
        context,
      );
      counters['owner-finalization'] = 1;
      if (!finalized.ok) {
        return failAttempt('owner-finalization', finalized.code, counters);
      }

      const composed = runAcceptedCompleteRealLocateCompositionV2(
        finalized.value,
        context,
      );
      counters.composition = 1;
      if (!composed.ok) {
        return failAttempt('composition', composed.code, counters);
      }

      const schema = runAcceptedCompleteRealLocateSchemaV2(
        composed.value,
        context,
      );
      counters.schema = 1;
      if (!schema.ok) {
        return failAttempt('schema', schema.code, counters);
      }

      const serialized = runAcceptedCompleteRealLocateSerializationBudgetV2(
        schema.value,
        context,
      );
      counters['serialization-budget'] = 1;
      if (!serialized.ok) {
        return failAttempt(
          'serialization-budget',
          serialized.code,
          counters,
        );
      }

      const accepted = createOpaqueTokenV2<AcceptedCompleteRealLocateShadowV2>();
      acceptedPrivate.set(
        accepted,
        Object.freeze({
          input,
          capability,
          execution: token,
          serialized: serialized.value,
          counters: Object.freeze({ ...counters }),
        }),
      );
      return Object.freeze({ ok: true, accepted });
    },
  };
  return Object.freeze(orchestrator);
}

export function requireAcceptedCompleteRealLocateShadowV2(
  accepted: AcceptedCompleteRealLocateShadowV2,
  expectedInput: Extract<CanonicalLocateExecutionV2, Readonly<{ ok: true }>>,
  expectedExecution: LocateProjectionExecutionCapabilityV2,
): AcceptedCompleteRealLocateShadowViewV2 {
  const record = acceptedPrivate.get(accepted);
  if (
    record === undefined ||
    record.input !== expectedInput ||
    record.capability !== expectedExecution
  ) {
    throw new TypeError('accepted complete real shadow untrusted');
  }
  requireCanonicalLocateExecutionTokenV2(expectedInput, expectedExecution);
  const view = requireTrustedSerializedLocateResultV2(
    record.serialized,
    expectedExecution,
  );
  return Object.freeze({
    value: view.value,
    compactJson: view.compactJson,
    utf8Bytes: view.utf8Bytes,
    serialized: record.serialized,
  });
}

export function readCompleteRealLocateShadowFailureObservationV2(
  failure: CompleteRealLocateShadowFailureV2,
): FailurePrivateV2 {
  const record = failurePrivate.get(failure);
  if (record === undefined) {
    throw new TypeError('complete real shadow failure untrusted');
  }
  return record;
}
