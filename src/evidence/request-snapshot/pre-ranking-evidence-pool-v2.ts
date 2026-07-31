import { PRE_RANKING_CANDIDATE_CAP_V2 } from './discovery-reservation-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type { CanonicalFileKeyV2 } from './canonical-file-identity-v2.js';
import type { UnsafeEvidenceDraftV2 } from './classified-evidence-record-v2.js';

declare const ELIGIBLE_DISCOVERY_REF_V2: unique symbol;
export type EligibleDiscoveryRefV2 = Readonly<object> & {
  readonly [ELIGIBLE_DISCOVERY_REF_V2]: never;
};

declare const FILE_BUCKET_REF_V2: unique symbol;
export type OpaqueFileBucketRefV2 = Readonly<object> & {
  readonly [FILE_BUCKET_REF_V2]: never;
};

declare const STABLE_RECORD_REF_V2: unique symbol;
export type StableRecordRefV2 = Readonly<object> & {
  readonly [STABLE_RECORD_REF_V2]: never;
};

declare const TRUSTED_STABLE_RECORD_VIEW_V2: unique symbol;
declare const TRUSTED_PRE_FINAL_ELIGIBLE_RECORD_VIEW_V2: unique symbol;

export type EvidenceRankingSignalsV2 =
  | Readonly<{
      kind: 'direct';
      focusLines: readonly [number, number];
      focusExcerpt: string;
    }>
  | Readonly<{
      kind: 'derived';
      focusLines: readonly [number, number];
      focusExcerpt: string;
    }>;

/**
 * F3-private internal evidence record。
 */
export interface InternalPreRankingEvidenceRecordV2 {
  readonly discoveryKey: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly safeKey: string;
  readonly draft: UnsafeEvidenceDraftV2 | undefined;
  readonly rankingSignals: EvidenceRankingSignalsV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
  readonly recordRef: StableRecordRefV2;
}

export interface PreRankingEvidencePoolV2 {
  readonly records: readonly InternalPreRankingEvidenceRecordV2[];
  readonly preRankingPoolTruncated: boolean;
  readonly safeSelectionCollision: boolean;
}

export interface PreFinalEligibleDiscoveryRecordV2 {
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly discoveryKey: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
  readonly classificationDefined: boolean;
}

export interface PreFinalEligibleDiscoveryPoolV2 {
  readonly records: readonly PreFinalEligibleDiscoveryRecordV2[];
}

/**
 * F2-visible：无 discoveryKey/canonical 字符串。
 */
export interface TrustedStableRecordViewV2 {
  readonly [TRUSTED_STABLE_RECORD_VIEW_V2]: never;
  readonly recordRef: StableRecordRefV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
  readonly draft: UnsafeEvidenceDraftV2;
  readonly rankingSignals: EvidenceRankingSignalsV2;
}

/**
 * F7/F8 narrow eligible view：无 identity/locator/discovery 字符串。
 */
export interface TrustedPreFinalEligibleRecordViewV2 {
  readonly [TRUSTED_PRE_FINAL_ELIGIBLE_RECORD_VIEW_V2]: never;
  readonly eligibleRef: EligibleDiscoveryRefV2;
  readonly fileBucketRef: OpaqueFileBucketRefV2;
}

interface FileBucketPrivateRecordV2 {
  readonly canonicalFileKey: CanonicalFileKeyV2;
}

interface StableRecordPrivateV2 {
  readonly discoveryKey: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
}

interface EligiblePrivateV2 {
  readonly discoveryKey: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
}

const fileBucketRecords = new WeakMap<
  OpaqueFileBucketRefV2,
  FileBucketPrivateRecordV2
>();
const stableRecordPrivate = new WeakMap<
  StableRecordRefV2,
  StableRecordPrivateV2
>();
const eligiblePrivate = new WeakMap<
  EligibleDiscoveryRefV2,
  EligiblePrivateV2
>();

/**
 * 同 canonical target 共享同一个无 payload fileBucketRef。
 */
export function obtainOpaqueFileBucketRefV2(
  canonicalFileKey: CanonicalFileKeyV2,
  buckets: Map<string, OpaqueFileBucketRefV2>,
): OpaqueFileBucketRefV2 {
  const existing = buckets.get(canonicalFileKey);
  if (existing !== undefined) {
    return existing;
  }
  const ref = createOpaqueTokenV2<OpaqueFileBucketRefV2>();
  fileBucketRecords.set(ref, Object.freeze({ canonicalFileKey }));
  buckets.set(canonicalFileKey, ref);
  return ref;
}

export interface PreRankingPoolInputRecordV2 {
  readonly discoveryKey: string;
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly safeKey: string;
  readonly draft?: UnsafeEvidenceDraftV2;
  readonly rankingSignals: EvidenceRankingSignalsV2;
  readonly classificationDefined: boolean;
}

/**
 * 按完整 safe key 分组；边界 collision 整组纳入/排除；
 * classification undefined 只进 eligible 池。
 */
export function buildPreRankingStablePoolsV2(
  inputs: readonly PreRankingPoolInputRecordV2[],
): {
  readonly evidence: PreRankingEvidencePoolV2;
  readonly eligible: PreFinalEligibleDiscoveryPoolV2;
} {
  const buckets = new Map<string, OpaqueFileBucketRefV2>();
  const groups = new Map<string, PreRankingPoolInputRecordV2[]>();
  for (const input of inputs) {
    const group = groups.get(input.safeKey);
    if (group === undefined) {
      groups.set(input.safeKey, [input]);
    } else {
      group.push(input);
    }
  }

  const evidenceRecords: InternalPreRankingEvidenceRecordV2[] = [];
  const eligibleRecords: PreFinalEligibleDiscoveryRecordV2[] = [];
  let occupied = 0;
  let preRankingPoolTruncated = false;
  let safeSelectionCollision = false;

  for (const group of groups.values()) {
    if (occupied + group.length > PRE_RANKING_CANDIDATE_CAP_V2) {
      preRankingPoolTruncated = true;
      safeSelectionCollision = true;
      break;
    }
    occupied += group.length;
    for (const input of group) {
      const fileBucketRef = obtainOpaqueFileBucketRefV2(
        input.canonicalFileKey,
        buckets,
      );
      const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
      eligiblePrivate.set(
        eligibleRef,
        Object.freeze({
          discoveryKey: input.discoveryKey,
          canonicalFileKey: input.canonicalFileKey,
        }),
      );
      eligibleRecords.push(
        Object.freeze({
          eligibleRef,
          discoveryKey: input.discoveryKey,
          canonicalFileKey: input.canonicalFileKey,
          fileBucketRef,
          classificationDefined: input.classificationDefined,
        }),
      );
      if (input.classificationDefined && input.draft !== undefined) {
        const recordRef = createOpaqueTokenV2<StableRecordRefV2>();
        stableRecordPrivate.set(
          recordRef,
          Object.freeze({
            discoveryKey: input.discoveryKey,
            canonicalFileKey: input.canonicalFileKey,
          }),
        );
        evidenceRecords.push(
          Object.freeze({
            discoveryKey: input.discoveryKey,
            canonicalFileKey: input.canonicalFileKey,
            safeKey: input.safeKey,
            draft: input.draft,
            rankingSignals: input.rankingSignals,
            fileBucketRef,
            recordRef,
          }),
        );
      }
    }
  }

  return Object.freeze({
    evidence: Object.freeze({
      records: Object.freeze(evidenceRecords),
      preRankingPoolTruncated,
      safeSelectionCollision,
    }),
    eligible: Object.freeze({
      records: Object.freeze(eligibleRecords),
    }),
  });
}

/**
 * F2 consumer view：只含 refs/draft/signals，无 canonical/discovery 字符串。
 */
export function toTrustedStableRecordViewsV2(
  pool: PreRankingEvidencePoolV2,
): readonly TrustedStableRecordViewV2[] {
  return Object.freeze(
    pool.records
      .filter((record) => record.draft !== undefined)
      .map((record) => {
        const view = createOpaqueTokenV2<TrustedStableRecordViewV2>();
        return Object.freeze({
          ...view,
          recordRef: record.recordRef,
          fileBucketRef: record.fileBucketRef,
          draft: record.draft!,
          rankingSignals: record.rankingSignals,
        }) as TrustedStableRecordViewV2;
      }),
  );
}

/**
 * F7/F8 narrow view：只含 eligibleRef/fileBucketRef。
 */
export function toTrustedPreFinalEligibleViewsV2(
  pool: PreFinalEligibleDiscoveryPoolV2,
): readonly TrustedPreFinalEligibleRecordViewV2[] {
  return Object.freeze(
    pool.records.map((record) => {
      const view = createOpaqueTokenV2<TrustedPreFinalEligibleRecordViewV2>();
      return Object.freeze({
        ...view,
        eligibleRef: record.eligibleRef,
        fileBucketRef: record.fileBucketRef,
      }) as TrustedPreFinalEligibleRecordViewV2;
    }),
  );
}

/**
 * 探测 consumer view 是否泄漏 private 字符串键。
 */
export function consumerViewLeaksPrivateStringsV2(view: object): boolean {
  const json = JSON.stringify(view);
  if (json.includes('discoveryKey') || json.includes('canonicalFileKey')) {
    return true;
  }
  return (
    Object.prototype.hasOwnProperty.call(view, 'discoveryKey') ||
    Object.prototype.hasOwnProperty.call(view, 'canonicalFileKey')
  );
}
