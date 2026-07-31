/**
 * F7 composition root：registrar 两 base ports + seal→arbitrate→materialize。
 * confirmation 只来自 requirePreFinalScopeClassificationViewV2 绑定的 decision。
 */

import {
  createEvidenceId,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type ExclusionReasonCode,
} from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { DiscoveryRecord } from '../discovery-record.js';
import {
  classifyDiscoveryRecords,
  type ClassificationContext,
  type ClassificationResult,
} from '../direct-mapping-classifier.js';
import type { BoundSafeDiscoverySelectionV2 } from '../request-snapshot/discovery-selection-binding-v2.js';
import type { CanonicalFileKeyV2 } from '../request-snapshot/canonical-file-identity-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import { requirePreFinalProducerBasisReceiptsV2 } from '../request-snapshot/producer-basis-receipts-v2.js';
import {
  obtainOpaqueFileBucketRefV2,
  type EligibleDiscoveryRefV2,
  type PreFinalEligibleDiscoveryPoolV2,
} from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  requirePreFinalScopeClassificationViewV2,
  type TrustedPreFinalScopeClassificationViewV2,
} from '../request-snapshot/scope-classification-views-v2.js';
import type { TrustedScopeFoldedSelectorViewV2 } from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { TrustedScopeEligibilityObservationV2 } from '../request-snapshot/trusted-scope-policy-adapter-v2.js';
import {
  arbitrateScopeBoundEvidenceProducerV2,
  createCandidateCollectorScopeProducerPortV2,
  createDirectClassifierScopeProducerPortV2,
  createScopeBoundProducerRegistrarV2,
  registerScopeBoundProducerSourceV2,
  sealScopeBoundProducerRecordSetV2,
  type RegisteredScopeBoundProducerPortV2,
  type ScopeBoundProducerKindV2,
  type ScopeBoundProducerRegistrarV2,
} from './scope-bound-producer-registrar-v2.js';
import { materializeScopeBoundEvidenceV2 } from './scope-bound-evidence-materializer-v2.js';
import { requirePreFinalScopeDecisionV1 } from './scope-decision-accessors-v1.js';

export interface ScopeBoundProducerCompositionRootV2 {
  readonly registrar: ScopeBoundProducerRegistrarV2;
  readonly directPort: RegisteredScopeBoundProducerPortV2;
  readonly candidatePort: RegisteredScopeBoundProducerPortV2;
  readonly execution: LocateExecutionTokenV2;
}

/**
 * F7 base composition root：登记 direct + candidate 两个 opaque ports。
 */
export function createScopeBoundProducerCompositionRootV2(
  execution: LocateExecutionTokenV2,
): ScopeBoundProducerCompositionRootV2 {
  const registrar = createScopeBoundProducerRegistrarV2(execution);
  const directPort = createDirectClassifierScopeProducerPortV2(
    registrar,
    execution,
  );
  const candidatePort = createCandidateCollectorScopeProducerPortV2(
    registrar,
    execution,
  );
  return Object.freeze({ registrar, directPort, candidatePort, execution });
}

function producerKindFromLegacyClassificationV2(
  evidenceClass: 'confirmed' | 'candidate',
  reasonCodes: readonly string[],
  hasSymbol: boolean,
): ScopeBoundProducerKindV2 | 'none' {
  if (reasonCodes.includes('DIRECT_ALIAS_MAPPING')) {
    return hasSymbol ? 'direct-anchored' : 'direct-term';
  }
  if (reasonCodes.includes('EXACT_SYMBOL_ANCHOR')) {
    return 'anchored-definition';
  }
  if (reasonCodes.includes('SYMBOL_REFERENCE_ONLY')) {
    return 'anchored-reference';
  }
  if (reasonCodes.includes('EXACT_TERM_WITHOUT_DIRECT_MAPPING')) {
    return 'verified-literal';
  }
  if (evidenceClass === 'candidate') {
    return 'secondary';
  }
  return 'none';
}

/**
 * 从 verified discovery records 构造 pre-final eligible pool（classifier seam）。
 */
function buildPreFinalEligiblePoolFromDiscoveryRecordsV2(
  records: readonly DiscoveryRecord[],
): {
  readonly pool: PreFinalEligibleDiscoveryPoolV2;
  readonly eligibleByDiscoveryKey: ReadonlyMap<string, EligibleDiscoveryRefV2>;
} {
  const buckets = new Map<
    string,
    ReturnType<typeof obtainOpaqueFileBucketRefV2>
  >();
  const poolRecords: PreFinalEligibleDiscoveryPoolV2['records'][number][] = [];
  const eligibleByDiscoveryKey = new Map<string, EligibleDiscoveryRefV2>();
  for (const record of records) {
    const canonicalFileKey = record.location.file.replaceAll(
      '\\',
      '/',
    ) as CanonicalFileKeyV2;
    const fileBucketRef = obtainOpaqueFileBucketRefV2(
      canonicalFileKey,
      buckets,
    );
    const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
    poolRecords.push(
      Object.freeze({
        eligibleRef,
        discoveryKey: record.discoveryKey,
        canonicalFileKey,
        fileBucketRef,
        classificationDefined: true,
      }),
    );
    eligibleByDiscoveryKey.set(record.discoveryKey, eligibleRef);
  }
  return Object.freeze({
    pool: Object.freeze({
      records: Object.freeze(poolRecords),
    }),
    eligibleByDiscoveryKey,
  });
}

function materializeLegacyItemThroughScopeBoundV2(input: {
  readonly root: ScopeBoundProducerCompositionRootV2;
  readonly scopeView: TrustedPreFinalScopeClassificationViewV2;
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly legacyItem: ConfirmedEvidence | CandidateEvidence;
  readonly locationFile: string;
  readonly locationLines: readonly [number, number];
}): ReturnType<typeof materializeScopeBoundEvidenceV2> {
  const kind = producerKindFromLegacyClassificationV2(
    input.legacyItem.evidenceClass,
    input.legacyItem.reasonCodes,
    input.legacyItem.location.symbol !== undefined,
  );
  const basis = requirePreFinalProducerBasisReceiptsV2({
    eligibleRef: input.eligibleRef,
    locationFile: input.locationFile,
    locationLines: input.locationLines,
    execution: input.root.execution,
  });
  if (kind === 'none') {
    registerScopeBoundProducerSourceV2(
      input.root.registrar,
      { kind: 'none' },
      input.root.directPort,
      input.scopeView,
      input.eligibleRef,
      input.root.execution,
    );
  } else {
    registerScopeBoundProducerSourceV2(
      input.root.registrar,
      {
        kind: 'facts',
        view: {
          owner: 'direct-classifier',
          producerKind: kind,
          producerBasis: basis,
          ...(kind === 'anchored-definition'
            ? {
                definitionRole:
                  input.legacyItem.role === 'execution-site'
                    ? ('execution-site' as const)
                    : ('definition' as const),
              }
            : {}),
          ...(input.legacyItem.location.symbol !== undefined
            ? { canonicalSymbol: input.legacyItem.location.symbol }
            : {}),
        },
      },
      input.root.directPort,
      input.scopeView,
      input.eligibleRef,
      input.root.execution,
    );
  }
  registerScopeBoundProducerSourceV2(
    input.root.registrar,
    { kind: 'none' },
    input.root.candidatePort,
    input.scopeView,
    input.eligibleRef,
    input.root.execution,
  );
  const seal = sealScopeBoundProducerRecordSetV2(
    input.root.registrar,
    input.scopeView,
    input.eligibleRef,
    input.root.execution,
  );
  const arbitration = arbitrateScopeBoundEvidenceProducerV2(
    seal,
    input.scopeView,
    input.eligibleRef,
    input.root.execution,
  );
  return materializeScopeBoundEvidenceV2(
    arbitration,
    input.scopeView,
    input.eligibleRef,
    input.root.execution,
  );
}

/**
 * Production classifier 路径：requirePreFinal 绑定 observation/fold/selection，
 * 同一 composition root 完成两 port 登记与 per-record seal→arbitrate→materialize。
 */
export function classifyDiscoveryRecordsThroughScopeBoundProducersV2(input: {
  readonly records: readonly DiscoveryRecord[];
  readonly context: ClassificationContext;
  readonly execution: LocateExecutionTokenV2;
  readonly observation: TrustedScopeEligibilityObservationV2;
  readonly foldedView: TrustedScopeFoldedSelectorViewV2;
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly initialExclusions?: Readonly<
    Partial<Record<ExclusionReasonCode, number>>
  >;
}): ClassificationResult {
  const root = createScopeBoundProducerCompositionRootV2(input.execution);
  const { pool, eligibleByDiscoveryKey } =
    buildPreFinalEligiblePoolFromDiscoveryRecordsV2(input.records);
  const scopeView = requirePreFinalScopeClassificationViewV2(
    pool,
    input.observation,
    input.foldedView,
    input.boundSelection,
    input.execution,
  );

  const legacy = classifyDiscoveryRecords(
    input.records,
    input.context,
    input.initialExclusions ?? {},
  );

  const publicByKey = new Map<string, ConfirmedEvidence | CandidateEvidence>();
  for (const item of [...legacy.confirmed, ...legacy.candidates]) {
    publicByKey.set(
      `${item.location.file}\0${item.location.lines.join(',')}`,
      item,
    );
  }

  const confirmed: ConfirmedEvidence[] = [];
  const candidates: CandidateEvidence[] = [];
  const exclusionSummary: Partial<Record<ExclusionReasonCode, number>> = {
    ...legacy.exclusionSummary,
  };

  for (const record of input.records) {
    const eligibleRef = eligibleByDiscoveryKey.get(record.discoveryKey);
    if (eligibleRef === undefined) {
      continue;
    }
    const decision = requirePreFinalScopeDecisionV1(
      scopeView,
      eligibleRef,
      input.execution,
    );
    if (!decision.included || decision.confirmation === 'excluded') {
      continue;
    }

    const key = `${record.location.file}\0${record.location.lines.join(',')}`;
    const legacyItem = publicByKey.get(key);
    if (legacyItem === undefined) {
      continue;
    }

    const draft = materializeLegacyItemThroughScopeBoundV2({
      root,
      scopeView,
      eligibleRef,
      legacyItem,
      locationFile: record.location.file,
      locationLines: record.location.lines,
    });
    if (draft === undefined) {
      continue;
    }
    const id = createEvidenceId(
      record.discoveryKey,
      draft.evidenceClass,
      draft.role,
    );
    // location/provenance 保留 legacy 已验证 excerpt；class/role/reasons 以 materializer 为准
    const location = Object.freeze({
      ...legacyItem.location,
      ...(draft.location.symbol !== undefined
        ? { symbol: draft.location.symbol }
        : {}),
    });
    const provenance = legacyItem.provenance;
    if (draft.evidenceClass === 'confirmed') {
      confirmed.push(
        Object.freeze({
          evidenceClass: 'confirmed',
          id,
          role: draft.role,
          location,
          provenance,
          reasonCodes: draft.reasonCodes,
        }),
      );
    } else {
      candidates.push(
        Object.freeze({
          evidenceClass: 'candidate',
          id,
          role: draft.role,
          location,
          provenance,
          reasonCodes: draft.reasonCodes,
          promotionRequirements: draft.promotionRequirements,
        }),
      );
    }
  }

  // 已走 require* seam：即使空结果也不回退 legacy（避免绕过 bound confirmation）
  return Object.freeze({
    confirmed: Object.freeze(confirmed),
    candidates: Object.freeze(candidates),
    exclusionSummary: Object.freeze(exclusionSummary),
    recordsClassified: confirmed.length + candidates.length,
  });
}
