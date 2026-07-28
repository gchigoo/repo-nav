import type {
  LocateExecutionTokenV2,
  RankedEvidenceFactsV2,
  SnapshotFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { SnapshotTrustProofV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type { TrustedStableEvidencePoolV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type { TrustedFinalSnapshotPoolsV2 } from '../request-snapshot/final-snapshot-check-v2.js';
import type { TrustedStableRecordViewV2 } from '../request-snapshot/pre-ranking-evidence-pool-v2.js';
import {
  anchorCompletenessV2,
  lookupTrustedSnapshotRankingViewV2,
  requireTrustedSnapshotRankingViewV2,
} from '../request-snapshot/trusted-snapshot-ranking-view-v2.js';
import type { BoundSafeDiscoverySelectionV2 } from '../request-snapshot/discovery-selection-binding-v2.js';
import { requireBoundDiscoverySelectionV2 } from '../request-snapshot/discovery-selection-binding-v2.js';
import type { NormalizedAnchorIntentV2 } from './anchor-intent-normalizer-v2.js';
import { rankStableNormalizedTermsV2 } from './anchor-intent-normalizer-v2.js';
import {
  buildUnsatisfiedAnchorsV2,
  classifyRecordPriorityV2,
  satisfactionForAnchorV2,
} from './anchor-satisfaction-v2.js';
import {
  buildPublicSafeOrderingKeyV2,
  comparePublicSafeOrderingKeyV2,
  orderingKeysEqualV2,
  type PublicSafeEvidenceOrderingKeyV2,
} from './public-safe-ordering-key-v2.js';
import { ordinaryRoundRobinSelectV2 } from './evidence-round-robin-v2.js';
import type { MatchPriorityV2 } from './match-priority-v2.js';
import {
  issueEvidenceRankingOutcomeV2,
  type EvidenceRankingOutcomeV2,
} from './evidence-ranking-outcome-v2.js';
import type { EvidenceBudgetFactsV2 } from './evidence-budget-facts-v2.js';

export type { EvidenceBudgetFactsV2 } from './evidence-budget-facts-v2.js';

export interface EvidenceRankingInputV2 {
  readonly finalPools: TrustedFinalSnapshotPoolsV2;
  readonly pool: TrustedStableEvidencePoolV2;
  readonly snapshotFacts: SnapshotFactsV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly normalizedTerms: readonly Readonly<{
    value: string;
    caseSensitive: boolean;
  }>[];
  readonly anchorIntents: readonly NormalizedAnchorIntentV2[];
  readonly limits: Readonly<{
    maxFiles: number;
    maxConfirmed: number;
    maxCandidates: number;
  }>;
  readonly discoverySelection: BoundSafeDiscoverySelectionV2;
  readonly execution: LocateExecutionTokenV2;
  readonly preRankingPoolTruncated?: boolean;
}

type EligibleFact = Readonly<{
  kind: 'eligible';
  record: TrustedStableRecordViewV2;
  priority: MatchPriorityV2;
  orderingKey: PublicSafeEvidenceOrderingKeyV2;
  matchedAnchorKeys: readonly string[];
  regularTermCount: number;
}>;

/**
 * EvidenceRankerV2：trust gate → tier → reservation → round-robin → outcome。
 */
export class EvidenceRankerV2 {
  public rank(input: EvidenceRankingInputV2): EvidenceRankingOutcomeV2 {
    const view = lookupTrustedSnapshotRankingViewV2({
      finalPools: input.finalPools,
      discoverySelection: input.discoverySelection,
      execution: input.execution,
    });
    const trusted = requireTrustedSnapshotRankingViewV2(
      view,
      input.snapshotProof,
      input.execution,
    );
    const bound = requireBoundDiscoverySelectionV2(
      input.discoverySelection,
      input.execution,
    );
    const regularTerms = rankStableNormalizedTermsV2(input.normalizedTerms);

    const eligible: EligibleFact[] = [];
    const collisionAnchorKeys = new Set<string>();
    let safeOrderingCollision = false;
    // 结构化 equality 分组：禁止 join/JSON codec（含完整 operation/source vectors）
    const equalityGroups: EligibleFact[][] = [];

    for (const record of trusted.records) {
      const classified = classifyRecordPriorityV2({
        record,
        anchorIntents: input.anchorIntents,
        regularTerms,
      });
      if (classified.priority === undefined) {
        continue;
      }
      const built = buildPublicSafeOrderingKeyV2(record, classified.priority);
      const fact: EligibleFact = Object.freeze({
        kind: 'eligible',
        record,
        priority: classified.priority,
        orderingKey: built.orderingKey,
        matchedAnchorKeys: classified.matchedAnchorKeys,
        regularTermCount: classified.regularTermCount,
      });
      let placed = false;
      for (const group of equalityGroups) {
        if (orderingKeysEqualV2(group[0]!.orderingKey, fact.orderingKey)) {
          group.push(fact);
          placed = true;
          break;
        }
      }
      if (!placed) {
        equalityGroups.push([fact]);
      }
    }

    for (const group of equalityGroups) {
      if (group.length === 1) {
        eligible.push(group[0]!);
        continue;
      }
      const distinct = new Set(group.map((item) => item.record.recordRef));
      if (distinct.size > 1) {
        safeOrderingCollision = true;
        for (const item of group) {
          for (const key of item.matchedAnchorKeys) {
            collisionAnchorKeys.add(key);
          }
        }
        continue;
      }
      eligible.push(group[0]!);
    }

    eligible.sort((left, right) =>
      comparePublicSafeOrderingKeyV2(left.orderingKey, right.orderingKey),
    );

    const selected = new Set<TrustedStableRecordViewV2>();
    const anchorSelected: TrustedStableRecordViewV2[] = [];
    const orderedAnchors = [...input.anchorIntents].sort((left, right) =>
      left.canonicalKey.localeCompare(right.canonicalKey),
    );

    let confirmedUsed = 0;
    let candidateUsed = 0;

    for (const intent of orderedAnchors) {
      const already = [...selected].some(
        (record) => satisfactionForAnchorV2(intent, record) !== 'none',
      );
      if (already) {
        continue;
      }
      const confirmedCandidates = eligible.filter(
        (fact) =>
          !selected.has(fact.record) &&
          satisfactionForAnchorV2(intent, fact.record) === 'confirmed' &&
          fact.record.draft.evidenceClass === 'confirmed',
      );
      const pickFrom = (facts: EligibleFact[], classBudget: number): boolean => {
        if (classBudget <= 0 || facts.length === 0) {
          return false;
        }
        facts.sort((left, right) =>
          comparePublicSafeOrderingKeyV2(left.orderingKey, right.orderingKey),
        );
        const chosen = facts[0]!;
        selected.add(chosen.record);
        anchorSelected.push(chosen.record);
        return true;
      };
      if (
        pickFrom(confirmedCandidates, input.limits.maxConfirmed - confirmedUsed)
      ) {
        confirmedUsed += 1;
        continue;
      }
      const candidateCandidates = eligible.filter(
        (fact) =>
          !selected.has(fact.record) &&
          satisfactionForAnchorV2(intent, fact.record) !== 'none',
      );
      if (
        pickFrom(candidateCandidates, input.limits.maxCandidates - candidateUsed)
      ) {
        candidateUsed += 1;
      }
    }

    const remainingConfirmed = eligible.filter(
      (fact) =>
        !selected.has(fact.record) &&
        fact.record.draft.evidenceClass === 'confirmed',
    );
    const remainingCandidates = eligible.filter(
      (fact) =>
        !selected.has(fact.record) &&
        fact.record.draft.evidenceClass === 'candidate',
    );

    const ordinaryConfirmed = ordinaryRoundRobinSelectV2(
      remainingConfirmed.map((fact) =>
        Object.freeze({ record: fact.record, orderingKey: fact.orderingKey }),
      ),
      Math.max(0, input.limits.maxConfirmed - confirmedUsed),
    );
    const ordinaryCandidates = ordinaryRoundRobinSelectV2(
      remainingCandidates.map((fact) =>
        Object.freeze({ record: fact.record, orderingKey: fact.orderingKey }),
      ),
      Math.max(0, input.limits.maxCandidates - candidateUsed),
    );

    const confirmed = Object.freeze([
      ...anchorSelected.filter(
        (record) => record.draft.evidenceClass === 'confirmed',
      ),
      ...ordinaryConfirmed,
    ]);
    const candidates = Object.freeze([
      ...anchorSelected.filter(
        (record) => record.draft.evidenceClass === 'candidate',
      ),
      ...ordinaryCandidates,
    ]);

    const budgetDeferredKeys = new Set(
      bound.draft.reservations
        .filter((reservation) => reservation.state === 'budget-deferred')
        .map((reservation) => reservation.anchorKey),
    );
    const completeness = new Map<string, 'complete' | 'incomplete'>();
    for (const intent of input.anchorIntents) {
      completeness.set(
        intent.canonicalKey,
        anchorCompletenessV2(view, intent.canonicalKey, bound.proof).state,
      );
    }

    const retained = Object.freeze([...confirmed, ...candidates]);
    const unsatisfiedAnchors = buildUnsatisfiedAnchorsV2({
      anchorIntents: input.anchorIntents,
      retained,
      completeness,
      collisionAnchorKeys,
      budgetDeferredKeys,
    });

    const toContractDraft = (
      draft: TrustedStableRecordViewV2['draft'],
    ): RankedEvidenceFactsV2['confirmed'][number] => {
      const location = Object.freeze({
        ...draft.location,
        resolvable: true as const,
      });
      return Object.freeze({
        ...draft,
        location,
      }) as RankedEvidenceFactsV2['confirmed'][number];
    };
    const fragment: RankedEvidenceFactsV2 = Object.freeze({
      confirmed: Object.freeze(confirmed.map((record) => toContractDraft(record.draft))),
      candidates: Object.freeze(
        candidates.map((record) => toContractDraft(record.draft)),
      ),
      unsatisfiedAnchors,
    });

    const budgetFacts: EvidenceBudgetFactsV2 = Object.freeze({
      maxFilesReached: bound.draft.filesTruncated,
      maxConfirmedReached: confirmed.length >= input.limits.maxConfirmed,
      maxCandidatesReached: candidates.length >= input.limits.maxCandidates,
      preRankingPoolTruncated: input.preRankingPoolTruncated === true,
      safeSelectorCollision: bound.draft.safeSelectionCollision,
      safeOrderingCollision,
    });

    return issueEvidenceRankingOutcomeV2({
      fragment,
      budgetFacts,
      confirmed,
      candidates,
      snapshotProof: input.snapshotProof,
      execution: input.execution,
      collisionAnchorKeys,
    });
  }
}
