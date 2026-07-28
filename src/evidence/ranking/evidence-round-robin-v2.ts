import type { TrustedStableRecordViewV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import type { OpaqueFileBucketRefV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  comparePublicSafeOrderingKeyV2,
  type PublicSafeEvidenceOrderingKeyV2,
} from './public-safe-ordering-key-v2.js';

export interface RoundRobinCandidateV2 {
  readonly record: TrustedStableRecordViewV2;
  readonly orderingKey: PublicSafeEvidenceOrderingKeyV2;
}

/**
 * 按 opaque file bucket 分桶后每轮每 bucket 取一条。
 */
export function ordinaryRoundRobinSelectV2(
  candidates: readonly RoundRobinCandidateV2[],
  capacity: number,
): readonly TrustedStableRecordViewV2[] {
  if (capacity <= 0 || candidates.length === 0) {
    return Object.freeze([]);
  }
  const buckets = new Map<OpaqueFileBucketRefV2, RoundRobinCandidateV2[]>();
  for (const candidate of candidates) {
    const bucket = candidate.record.fileBucketRef;
    const list = buckets.get(bucket);
    if (list === undefined) {
      buckets.set(bucket, [candidate]);
    } else {
      list.push(candidate);
    }
  }
  for (const list of buckets.values()) {
    list.sort((left, right) =>
      comparePublicSafeOrderingKeyV2(left.orderingKey, right.orderingKey),
    );
  }
  const active = [...buckets.entries()].sort((left, right) => {
    const leftHead = left[1][0]!;
    const rightHead = right[1][0]!;
    return comparePublicSafeOrderingKeyV2(
      leftHead.orderingKey,
      rightHead.orderingKey,
    );
  });
  const selected: TrustedStableRecordViewV2[] = [];
  while (selected.length < capacity) {
    let progressed = false;
    for (const [, list] of active) {
      if (selected.length >= capacity) {
        break;
      }
      const next = list.shift();
      if (next === undefined) {
        continue;
      }
      selected.push(next.record);
      progressed = true;
    }
    if (!progressed) {
      break;
    }
  }
  return Object.freeze(selected);
}
