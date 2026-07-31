import {
  applyCandidatePolicy,
  type CandidatePolicyInput,
  type CandidatePolicyResult,
  type ClassifiedCandidateDraft,
  type VerifiedCandidateContext,
} from '../candidate-policy/apply-candidate-policy.js';
import type { DiscoveryRecord } from '../discovery-record.js';

/**
 * Legacy reservation：只消费 legacy direct retained contexts，严格复现 v1 applyCandidatePolicy。
 */
export class LegacyCandidateReservationV1 {
  /**
   * 对 legacy retained seeds 执行与现网完全相同的 candidate selection。
   */
  public reserve(input: {
    readonly contexts: readonly VerifiedCandidateContext[];
    readonly records: readonly DiscoveryRecord[];
    readonly maxCandidates: number;
    readonly signal: AbortSignal;
  }): CandidatePolicyResult {
    const policyInput: CandidatePolicyInput = Object.freeze({
      contexts: input.contexts,
      records: input.records,
      maxCandidates: input.maxCandidates,
      signal: input.signal,
    });
    return applyCandidatePolicy(policyInput);
  }

  /**
   * expanded-only reserved token 不得抑制 legacy proposal：legacy 使用独立 record universe。
   */
  public filterLegacyRecords(
    allRecords: readonly DiscoveryRecord[],
    retainedSeedKeys: ReadonlySet<string>,
  ): readonly DiscoveryRecord[] {
    return Object.freeze(
      allRecords.filter((record) => retainedSeedKeys.has(record.discoveryKey)),
    );
  }
}

export type { ClassifiedCandidateDraft, VerifiedCandidateContext };
