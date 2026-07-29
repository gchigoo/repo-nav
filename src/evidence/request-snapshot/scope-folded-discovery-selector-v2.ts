import type { SearchBackendId } from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { DISCOVERY_RESERVATION_CAP_V2 } from './discovery-reservation-v2.js';
import type {
  DiscoveryLocatorRefV2,
  PreCapPublicSafeDiscoveryPoolV2,
  PublicSafeExpandedCandidateV2,
  PublicSafeRankingKeyV2,
} from './discovery-lane-universe-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import {
  requireTrustedScopeEligibilityObservationV2,
  type TrustedScopeEligibilityObservationV2,
} from './trusted-scope-policy-adapter-v2.js';

declare const SCOPE_FOLDED_SAFE_POOL_PROOF_V2: unique symbol;
export type ScopeFoldedSafePoolProofV2 = Readonly<object> & {
  readonly [SCOPE_FOLDED_SAFE_POOL_PROOF_V2]: never;
};

declare const TRUSTED_SCOPE_FOLDED_SELECTOR_VIEW_V2: unique symbol;
export type TrustedScopeFoldedSelectorViewV2 = Readonly<object> & {
  readonly [TRUSTED_SCOPE_FOLDED_SELECTOR_VIEW_V2]: never;
};

export type ScopeEligibilityConfirmationV2 =
  'allowed' | 'candidate-only' | 'excluded';

export interface ScopeEligibilityDecisionV2 {
  readonly layer: string;
  readonly included: boolean;
  readonly confirmation: ScopeEligibilityConfirmationV2;
}

export interface ScopeFoldCandidateDecisionV2 {
  readonly locatorRef: DiscoveryLocatorRefV2;
  readonly decision: ScopeEligibilityDecisionV2;
}

export interface ScopeExcludedDiscoveryLedgerEntryV2 {
  readonly locatorRef: DiscoveryLocatorRefV2;
}

export interface ScopeFoldedSelectorCandidateViewV2 {
  readonly locatorRef: DiscoveryLocatorRefV2;
  readonly safeKey: PublicSafeRankingKeyV2;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly source: SearchBackendId;
  readonly querySeedKeys: readonly string[];
  readonly matchedAnchorKeys: readonly string[];
}

export interface ScopeFoldedSelectorFactsViewV2 {
  readonly candidates: readonly ScopeFoldedSelectorCandidateViewV2[];
  readonly complete: boolean;
  readonly safeSelectionCollision: boolean;
  readonly filesTruncated: boolean;
  readonly excludedLedger: readonly ScopeExcludedDiscoveryLedgerEntryV2[];
}

interface FoldedSelectorPrivateRecordV2 {
  readonly facts: ScopeFoldedSelectorFactsViewV2;
  readonly proof: ScopeFoldedSafePoolProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly preCapPool: PreCapPublicSafeDiscoveryPoolV2;
}

const foldedSelectorRecords = new WeakMap<
  TrustedScopeFoldedSelectorViewV2,
  FoldedSelectorPrivateRecordV2
>();

const SOURCE_ORDER: readonly SearchBackendId[] = ['codegraph', 'ripgrep'];

function sourceOrder(source: SearchBackendId): number {
  const index = SOURCE_ORDER.indexOf(source);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function safeKeyTuple(candidate: PublicSafeExpandedCandidateV2): string {
  return [
    candidate.safeKey.file,
    String(candidate.lineStart),
    String(candidate.lineEnd),
    candidate.safeKey.symbol,
    String(sourceOrder(candidate.source)),
  ].join('\u0000');
}

function foldWithDecisionsV2(
  preCapPool: PreCapPublicSafeDiscoveryPoolV2,
  decisions: readonly ScopeFoldCandidateDecisionV2[],
  execution: LocateExecutionTokenV2,
): TrustedScopeFoldedSelectorViewV2 {
  if (!preCapPool.complete) {
    const proof = createOpaqueTokenV2<ScopeFoldedSafePoolProofV2>();
    const view = createOpaqueTokenV2<TrustedScopeFoldedSelectorViewV2>();
    const facts: ScopeFoldedSelectorFactsViewV2 = Object.freeze({
      candidates: Object.freeze([]),
      complete: false,
      safeSelectionCollision: false,
      filesTruncated: false,
      excludedLedger: Object.freeze([]),
    });
    foldedSelectorRecords.set(
      view,
      Object.freeze({ facts, proof, execution, preCapPool }),
    );
    return view;
  }

  const decisionByRef = new Map<
    DiscoveryLocatorRefV2,
    ScopeEligibilityDecisionV2
  >();
  for (const entry of decisions) {
    decisionByRef.set(entry.locatorRef, entry.decision);
  }

  const groups = new Map<string, PublicSafeExpandedCandidateV2[]>();
  for (const candidate of preCapPool.candidates) {
    const key = safeKeyTuple(candidate);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [candidate]);
    } else {
      group.push(candidate);
    }
  }

  const excludedLedger: ScopeExcludedDiscoveryLedgerEntryV2[] = [];
  const eligibleGroups: PublicSafeExpandedCandidateV2[][] = [];
  let safeSelectionCollision = false;

  for (const group of groups.values()) {
    const membership = group.map((candidate) => {
      const decision = decisionByRef.get(candidate.locatorRef);
      if (decision === undefined) {
        throw new TypeError('missing scope decision for locator');
      }
      return decision;
    });
    const allExcluded = membership.every(
      (decision) => !decision.included || decision.confirmation === 'excluded',
    );
    const allIncluded = membership.every(
      (decision) => decision.included && decision.confirmation !== 'excluded',
    );
    if (allExcluded) {
      for (const candidate of group) {
        excludedLedger.push(
          Object.freeze({ locatorRef: candidate.locatorRef }),
        );
      }
      continue;
    }
    if (!allIncluded) {
      // included/excluded mixed：整组排除；只计 excluded identities 进 outside
      safeSelectionCollision = true;
      for (const candidate of group) {
        const decision = decisionByRef.get(candidate.locatorRef)!;
        if (!decision.included || decision.confirmation === 'excluded') {
          excludedLedger.push(
            Object.freeze({ locatorRef: candidate.locatorRef }),
          );
        }
      }
      continue;
    }
    const confirmations = new Set(
      membership.map((decision) => decision.confirmation),
    );
    if (confirmations.size > 1) {
      // allowed/candidate-only mixed：整组排除，outside=0，强制 collision
      safeSelectionCollision = true;
      continue;
    }
    eligibleGroups.push(group);
  }

  const selected: ScopeFoldedSelectorCandidateViewV2[] = [];
  let occupied = 0;
  let filesTruncated = false;
  for (const group of eligibleGroups) {
    if (occupied + group.length > DISCOVERY_RESERVATION_CAP_V2) {
      filesTruncated = true;
      safeSelectionCollision = true;
      break;
    }
    occupied += group.length;
    for (const candidate of group) {
      selected.push(
        Object.freeze({
          locatorRef: candidate.locatorRef,
          safeKey: candidate.safeKey,
          lineStart: candidate.lineStart,
          lineEnd: candidate.lineEnd,
          source: candidate.source,
          querySeedKeys: candidate.querySeedKeys,
          matchedAnchorKeys: candidate.matchedAnchorKeys,
        }),
      );
    }
  }

  const seenExcluded = new Set<DiscoveryLocatorRefV2>();
  const uniqueExcluded: ScopeExcludedDiscoveryLedgerEntryV2[] = [];
  for (const entry of excludedLedger) {
    if (seenExcluded.has(entry.locatorRef)) {
      continue;
    }
    seenExcluded.add(entry.locatorRef);
    uniqueExcluded.push(entry);
  }

  const proof = createOpaqueTokenV2<ScopeFoldedSafePoolProofV2>();
  const view = createOpaqueTokenV2<TrustedScopeFoldedSelectorViewV2>();
  const facts: ScopeFoldedSelectorFactsViewV2 = Object.freeze({
    candidates: Object.freeze(selected),
    complete: !filesTruncated && !safeSelectionCollision,
    safeSelectionCollision,
    filesTruncated,
    excludedLedger: Object.freeze(uniqueExcluded),
  });
  foldedSelectorRecords.set(
    view,
    Object.freeze({ facts, proof, execution, preCapPool }),
  );
  return view;
}

/**
 * 对 complete-safe pre-cap pool 做 scope fold，再应用固定 800 cap。
 * 兼容测试入口：直接传 decisions（F3 observation 路径见 overload）。
 */
export function scopeFoldSafeCandidatePoolV2(
  preCapPool: PreCapPublicSafeDiscoveryPoolV2,
  decisionsOrObservation:
    | readonly ScopeFoldCandidateDecisionV2[]
    | TrustedScopeEligibilityObservationV2,
  execution: LocateExecutionTokenV2,
): TrustedScopeFoldedSelectorViewV2 {
  if (Array.isArray(decisionsOrObservation)) {
    return foldWithDecisionsV2(preCapPool, decisionsOrObservation, execution);
  }
  const observed = requireTrustedScopeEligibilityObservationV2(
    decisionsOrObservation as TrustedScopeEligibilityObservationV2,
    execution,
  );
  if (observed.preCapPool !== preCapPool) {
    throw new TypeError('scope observation pre-cap pool mismatch');
  }
  return foldWithDecisionsV2(preCapPool, observed.decisions, execution);
}

/**
 * 读取 fold proof（同 execution）。
 */
export function readScopeFoldedSafePoolProofV2(
  view: TrustedScopeFoldedSelectorViewV2,
  execution: LocateExecutionTokenV2,
): ScopeFoldedSafePoolProofV2 {
  const record = foldedSelectorRecords.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('scope folded selector view is not trusted');
  }
  return record.proof;
}

/**
 * 观察前验证 token/execution，再物化 public-safe facts。
 */
export function readScopeFoldedSelectorFactsV2(
  view: TrustedScopeFoldedSelectorViewV2,
  execution: LocateExecutionTokenV2,
): ScopeFoldedSelectorFactsViewV2 {
  const record = foldedSelectorRecords.get(view);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('scope folded selector view is not trusted');
  }
  return record.facts;
}
