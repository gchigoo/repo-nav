import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type {
  CandidateEvidenceV2,
  ConfirmedEvidenceV2,
} from '../../contracts/v2/locate-result-v2.js';
import { createOpaqueTokenV2 } from '../request-snapshot/opaque-token-v2.js';
import type { StableRecordRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { UnsafeEvidenceDraftV2 } from '../request-snapshot/classified-evidence-record-v2.js';
import {
  collectSensitiveCorpusV2,
  redactPublicFieldForSourceV2,
} from './sensitive-value-policy-v2.js';
import {
  applyPublicFieldBudgetV2,
  guardSensitiveCorpusBudgetV2,
} from './result-resource-budget-guards-v2.js';

declare const PUBLIC_MATERIALIZATION_PROOF_V2: unique symbol;
export type PublicMaterializationProofV2 = Readonly<object> & {
  readonly [PUBLIC_MATERIALIZATION_PROOF_V2]: never;
};

declare const UNSAFE_PUBLIC_MATERIALIZATION_SOURCE_PROOF_V2: unique symbol;
export type UnsafePublicMaterializationSourceProofV2 = Readonly<object> & {
  readonly [UNSAFE_PUBLIC_MATERIALIZATION_SOURCE_PROOF_V2]: never;
};

export interface PublicMaterializationContributionV2 {
  readonly owner: 'public-materialization';
  readonly locationRedacted: boolean;
}

export interface MaterializedPublicTermV2 {
  readonly value: string;
  readonly caseSensitive: boolean;
}

export type MaterializedEvidenceWithoutIdentityV2 =
  | Readonly<Omit<ConfirmedEvidenceV2, 'id'>>
  | Readonly<Omit<CandidateEvidenceV2, 'id'>>;

export interface RankedUnsafeEvidenceRefForMaterializationV2 {
  readonly recordRef: StableRecordRefV2;
  readonly draft: UnsafeEvidenceDraftV2;
}

export interface UnsafePublicMaterializationSourceV2 {
  readonly normalizedTerms: readonly Readonly<{
    value: string;
    caseSensitive: boolean;
  }>[];
  readonly rankedConfirmed: readonly RankedUnsafeEvidenceRefForMaterializationV2[];
  readonly rankedCandidates: readonly RankedUnsafeEvidenceRefForMaterializationV2[];
  readonly proof: UnsafePublicMaterializationSourceProofV2;
}

declare const TRUSTED_MATERIALIZED_EVIDENCE_CORE_V2: unique symbol;
/**
 * F1 core：opaque token；字段只经 accessor 暴露。
 */
export type TrustedMaterializedEvidenceCoreV2 = Readonly<object> & {
  readonly [TRUSTED_MATERIALIZED_EVIDENCE_CORE_V2]: never;
};

type MaterializedConfirmedV2 = Readonly<Omit<ConfirmedEvidenceV2, 'id'>>;
type MaterializedCandidateV2 = Readonly<Omit<CandidateEvidenceV2, 'id'>>;

interface CoreRecordV2 {
  readonly normalizedTerms: readonly MaterializedPublicTermV2[];
  readonly confirmed: readonly MaterializedConfirmedV2[];
  readonly candidates: readonly MaterializedCandidateV2[];
  readonly contribution: PublicMaterializationContributionV2;
  readonly proof: PublicMaterializationProofV2;
  readonly sourceProof: UnsafePublicMaterializationSourceProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly rawConfirmed: readonly RankedUnsafeEvidenceRefForMaterializationV2[];
  readonly rawCandidates: readonly RankedUnsafeEvidenceRefForMaterializationV2[];
}

const coreRecords = new WeakMap<
  TrustedMaterializedEvidenceCoreV2,
  CoreRecordV2
>();
const contributionBindings = new WeakMap<
  PublicMaterializationContributionV2,
  Readonly<{
    sourceProof: UnsafePublicMaterializationSourceProofV2;
    execution: LocateExecutionTokenV2;
  }>
>();

function materializeDraftLocation(
  source: object,
  draft: UnsafeEvidenceDraftV2,
  corpus: ReturnType<typeof collectSensitiveCorpusV2>,
): {
  readonly location: MaterializedEvidenceWithoutIdentityV2['location'];
  readonly locationRedacted: boolean;
} {
  const file = applyPublicFieldBudgetV2(
    'file',
    redactPublicFieldForSourceV2(source, draft.location.file, 'file', corpus),
  );
  const excerpt = applyPublicFieldBudgetV2(
    'excerpt',
    redactPublicFieldForSourceV2(
      source,
      draft.location.excerpt,
      'excerpt',
      corpus,
    ),
  );
  const symbol =
    draft.location.symbol === undefined
      ? undefined
      : applyPublicFieldBudgetV2(
          'symbol',
          redactPublicFieldForSourceV2(
            source,
            draft.location.symbol,
            'symbol',
            corpus,
          ),
        );
  const locationRedacted =
    file.reasonCodes.length > 0 ||
    excerpt.reasonCodes.length > 0 ||
    (symbol !== undefined && symbol.reasonCodes.length > 0);
  return Object.freeze({
    location: Object.freeze({
      file: file.value,
      resolvable: file.reasonCodes.length === 0,
      lines: draft.location.lines,
      excerpt: excerpt.value,
      ...(symbol === undefined ? {} : { symbol: symbol.value }),
    }),
    locationRedacted,
  });
}

/**
 * F1 single materializer：corpus → F1B corpus guard → field budgets → freeze core。
 */
export function materializePublicEvidenceV2(
  source: UnsafePublicMaterializationSourceV2,
  execution: LocateExecutionTokenV2,
): TrustedMaterializedEvidenceCoreV2 {
  const corpusInput = Object.freeze({
    normalizedTerms: source.normalizedTerms,
    confirmed: source.rankedConfirmed.map((item) => item.draft),
    candidates: source.rankedCandidates.map((item) => item.draft),
  });
  const corpus = collectSensitiveCorpusV2(corpusInput);
  const corpusGuard = guardSensitiveCorpusBudgetV2(corpus);
  if (!corpusGuard.ok) {
    throw new TypeError('public materialization corpus budget failed');
  }

  let locationRedacted = false;
  const confirmed: MaterializedConfirmedV2[] = [];
  for (const item of source.rankedConfirmed) {
    const materialized = materializeDraftLocation(
      corpusInput,
      item.draft,
      corpus,
    );
    locationRedacted = locationRedacted || materialized.locationRedacted;
    const draft = item.draft;
    if (draft.evidenceClass !== 'confirmed') {
      throw new TypeError('confirmed class mismatch');
    }
    confirmed.push(
      Object.freeze({
        evidenceClass: 'confirmed' as const,
        role: draft.role,
        location: materialized.location,
        provenance: draft.provenance,
        reasonCodes: draft.reasonCodes,
      }),
    );
  }
  const candidates: MaterializedCandidateV2[] = [];
  for (const item of source.rankedCandidates) {
    const materialized = materializeDraftLocation(
      corpusInput,
      item.draft,
      corpus,
    );
    locationRedacted = locationRedacted || materialized.locationRedacted;
    const draft = item.draft;
    if (draft.evidenceClass !== 'candidate') {
      throw new TypeError('candidate class mismatch');
    }
    candidates.push(
      Object.freeze({
        evidenceClass: 'candidate' as const,
        role: draft.role,
        location: materialized.location,
        provenance: draft.provenance,
        reasonCodes: draft.reasonCodes,
        promotionRequirements: draft.promotionRequirements,
      }),
    );
  }

  const normalizedTerms = Object.freeze(
    source.normalizedTerms.map((term) => {
      const redaction = applyPublicFieldBudgetV2(
        'term',
        redactPublicFieldForSourceV2(corpusInput, term.value, 'term', corpus),
      );
      return Object.freeze({
        value: redaction.value,
        caseSensitive: term.caseSensitive,
      });
    }),
  );

  const contribution: PublicMaterializationContributionV2 = Object.freeze({
    owner: 'public-materialization' as const,
    locationRedacted,
  });
  contributionBindings.set(
    contribution,
    Object.freeze({ sourceProof: source.proof, execution }),
  );
  const proof = createOpaqueTokenV2<PublicMaterializationProofV2>();
  const core = createOpaqueTokenV2<TrustedMaterializedEvidenceCoreV2>();
  coreRecords.set(
    core,
    Object.freeze({
      normalizedTerms,
      confirmed: Object.freeze(confirmed),
      candidates: Object.freeze(candidates),
      contribution,
      proof,
      sourceProof: source.proof,
      execution,
      rawConfirmed: source.rankedConfirmed,
      rawCandidates: source.rankedCandidates,
    }),
  );
  return core;
}

/**
 * F1 contribution accessor：核对 source proof / execution。
 */
export function requirePublicMaterializationContributionV2(
  contribution: PublicMaterializationContributionV2,
  expectedSourceProof: UnsafePublicMaterializationSourceProofV2,
  expectedExecution: LocateExecutionTokenV2,
): PublicMaterializationContributionV2 {
  const bound = contributionBindings.get(contribution);
  if (
    bound === undefined ||
    bound.sourceProof !== expectedSourceProof ||
    bound.execution !== expectedExecution
  ) {
    throw new TypeError('public materialization contribution is not trusted');
  }
  return contribution;
}

/**
 * 读取已签发 core 的冻结字段（F2 registrar 投影用）。
 */
export function readTrustedMaterializedEvidenceCoreV2(
  core: TrustedMaterializedEvidenceCoreV2,
  expectedSourceProof: UnsafePublicMaterializationSourceProofV2,
  expectedExecution: LocateExecutionTokenV2,
): CoreRecordV2 {
  const record = coreRecords.get(core);
  if (
    record === undefined ||
    record.sourceProof !== expectedSourceProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('materialized evidence core is not trusted');
  }
  return record;
}

export interface TrustedMaterializedEvidenceSummaryV2 {
  readonly contribution: PublicMaterializationContributionV2;
  readonly evidenceCount: number;
  readonly locationRedacted: boolean;
  readonly hasCandidates: boolean;
}

/**
 * F6 窄读：仅 contribution 身份与计数；不暴露 source proof / 不重验 F1 accessor。
 */
export function readTrustedMaterializedEvidenceSummaryV2(
  core: TrustedMaterializedEvidenceCoreV2,
  expectedExecution: LocateExecutionTokenV2,
): TrustedMaterializedEvidenceSummaryV2 {
  const record = coreRecords.get(core);
  if (record === undefined || record.execution !== expectedExecution) {
    throw new TypeError('materialized evidence core is not trusted');
  }
  return Object.freeze({
    contribution: record.contribution,
    evidenceCount: record.confirmed.length + record.candidates.length,
    locationRedacted: record.contribution.locationRedacted,
    hasCandidates: record.candidates.length > 0,
  });
}
