import {
  createDiscoveryKey,
  createEvidenceId,
  type CandidateEvidence,
  type CandidateReasonCode,
  type ConfirmedEvidence,
  type ConfirmedReasonCode,
  type EvidenceProvenance,
  type EvidenceRole,
  type PromotionRequirementCode,
} from '../../contracts/index.js';
import type { DiscoveryRecord } from '../discovery-record.js';
import {
  classifyDiscoveryRecords,
  type ClassificationContext,
  type ClassificationResult,
} from '../direct-mapping-classifier.js';
import type { CanonicalFileKeyV2 } from './canonical-file-identity-v2.js';

/**
 * 无 ID 的 unsafe draft；v1 adapter 另按 discoveryKey/class/role 生成 hash ID。
 */
export type UnsafeEvidenceDraftV2 =
  | Readonly<{
      evidenceClass: 'confirmed';
      role: EvidenceRole;
      location: ConfirmedEvidence['location'];
      provenance: EvidenceProvenance;
      reasonCodes: readonly ConfirmedReasonCode[];
    }>
  | Readonly<{
      evidenceClass: 'candidate';
      role: EvidenceRole;
      location: CandidateEvidence['location'];
      provenance: EvidenceProvenance;
      reasonCodes: readonly CandidateReasonCode[];
      promotionRequirements: readonly PromotionRequirementCode[];
    }>;

/**
 * F3-private identity record：携带 discovery/canonical，不直接暴露给 F2。
 */
export interface ClassifiedEvidenceRecordV2 {
  readonly discoveryKey: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly draft: UnsafeEvidenceDraftV2;
  readonly legacyMaterialization: Readonly<{
    evidenceClass: 'confirmed' | 'candidate';
    role: EvidenceRole;
  }>;
}

export interface ClassifyToInternalRecordsResultV2 {
  readonly records: readonly ClassifiedEvidenceRecordV2[];
  readonly undefinedClassificationKeys: readonly string[];
  readonly legacy: ClassificationResult;
}

/**
 * 先跑现有 classifier，再拆成 F3-private internal records。
 * classification 为 undefined / 被排除的 discoveryKey 只进 undefined 列表（eligible 池）。
 */
export function classifyToInternalRecordsV2(
  discoveryRecords: readonly DiscoveryRecord[],
  context: ClassificationContext,
  canonicalFileKeyFor: (locator: string) => CanonicalFileKeyV2,
  initialExclusions: Parameters<typeof classifyDiscoveryRecords>[2] = {},
): ClassifyToInternalRecordsResultV2 {
  const legacy = classifyDiscoveryRecords(
    discoveryRecords,
    context,
    initialExclusions,
  );
  const publicByDiscovery = new Map<string, ConfirmedEvidence | CandidateEvidence>();
  for (const item of legacy.confirmed) {
    publicByDiscovery.set(createDiscoveryKey(item.location), item);
  }
  for (const item of legacy.candidates) {
    publicByDiscovery.set(createDiscoveryKey(item.location), item);
  }

  const records: ClassifiedEvidenceRecordV2[] = [];
  const undefinedClassificationKeys: string[] = [];

  for (const record of discoveryRecords) {
    const publicItem = publicByDiscovery.get(record.discoveryKey);
    if (publicItem === undefined) {
      undefinedClassificationKeys.push(record.discoveryKey);
      continue;
    }
    const draft: UnsafeEvidenceDraftV2 =
      publicItem.evidenceClass === 'confirmed'
        ? Object.freeze({
            evidenceClass: 'confirmed',
            role: publicItem.role,
            location: publicItem.location,
            provenance: publicItem.provenance,
            reasonCodes: publicItem.reasonCodes,
          })
        : Object.freeze({
            evidenceClass: 'candidate',
            role: publicItem.role,
            location: publicItem.location,
            provenance: publicItem.provenance,
            reasonCodes: publicItem.reasonCodes,
            promotionRequirements: publicItem.promotionRequirements,
          });
    records.push(
      Object.freeze({
        discoveryKey: record.discoveryKey,
        canonicalFileKey: canonicalFileKeyFor(record.location.file),
        draft,
        legacyMaterialization: Object.freeze({
          evidenceClass: publicItem.evidenceClass,
          role: publicItem.role,
        }),
      }),
    );
  }

  return Object.freeze({
    records: Object.freeze(records),
    undefinedClassificationKeys: Object.freeze(undefinedClassificationKeys),
    legacy,
  });
}

/**
 * v1 adapter：从 internal record 生成带 hash ID 的 public evidence。
 */
export function materializeLegacyEvidenceFromInternalV2(
  record: ClassifiedEvidenceRecordV2,
): ConfirmedEvidence | CandidateEvidence {
  const id = createEvidenceId(
    record.discoveryKey,
    record.legacyMaterialization.evidenceClass,
    record.legacyMaterialization.role,
  );
  if (record.draft.evidenceClass === 'confirmed') {
    return Object.freeze({
      evidenceClass: 'confirmed' as const,
      id,
      role: record.draft.role,
      location: record.draft.location,
      provenance: record.draft.provenance,
      reasonCodes: record.draft.reasonCodes,
    });
  }
  return Object.freeze({
    evidenceClass: 'candidate' as const,
    id,
    role: record.draft.role,
    location: record.draft.location,
    provenance: record.draft.provenance,
    reasonCodes: record.draft.reasonCodes,
    promotionRequirements: record.draft.promotionRequirements,
  });
}
