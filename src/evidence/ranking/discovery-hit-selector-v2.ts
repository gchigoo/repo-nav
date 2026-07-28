import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { NormalizedAnchorIntentV2 } from './anchor-intent-normalizer-v2.js';
import {
  readScopeFoldedSelectorFactsV2,
  type ScopeFoldedSelectorCandidateViewV2,
  type TrustedScopeFoldedSelectorViewV2,
} from '../request-snapshot/scope-folded-discovery-selector-v2.js';
import type { DiscoveryLocatorRefV2 } from '../request-snapshot/discovery-lane-universe-v2.js';
import {
  bindDiscoverySelectionV2,
  type BoundSafeDiscoverySelectionV2,
  type SafeDiscoveryAnchorReservationV2,
  type SafeDiscoverySelectionDraftV2,
} from '../request-snapshot/discovery-selection-binding-v2.js';

export interface DiscoveryHitSelectionDraftV2 {
  readonly draft: SafeDiscoverySelectionDraftV2;
}

export interface DiscoveryHitSelectionV2 {
  readonly bound: BoundSafeDiscoverySelectionV2;
}

function safeSelectorKey(candidate: ScopeFoldedSelectorCandidateViewV2): string {
  return [
    candidate.safeKey.file,
    String(candidate.lineStart),
    String(candidate.lineEnd),
    candidate.safeKey.symbol,
    candidate.source,
  ].join('\u0001');
}

function groupBySafeKey(
  candidates: readonly ScopeFoldedSelectorCandidateViewV2[],
): Map<string, ScopeFoldedSelectorCandidateViewV2[]> {
  const groups = new Map<string, ScopeFoldedSelectorCandidateViewV2[]>();
  for (const candidate of candidates) {
    const key = safeSelectorKey(candidate);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [candidate]);
    } else {
      group.push(candidate);
    }
  }
  return groups;
}

/**
 * 读取前 maxFiles reservation：只消费 F3 opaque folded view。
 */
export class DiscoveryHitSelectorV2 {
  /**
   * 唯一入口：先 accessor，再按 safe 等价类原子 reservation。
   */
  public select(
    selectorView: TrustedScopeFoldedSelectorViewV2,
    anchorIntents: readonly NormalizedAnchorIntentV2[],
    maxFiles: number,
    execution: LocateExecutionTokenV2,
  ): DiscoveryHitSelectionDraftV2 {
    const facts = readScopeFoldedSelectorFactsV2(selectorView, execution);
    const groups = groupBySafeKey(facts.candidates);
    const selected = new Set<DiscoveryLocatorRefV2>();
    const reservations: SafeDiscoveryAnchorReservationV2[] = [];
    let occupied = 0;
    let filesTruncated = facts.filesTruncated;
    let safeSelectionCollision = facts.safeSelectionCollision;

    const orderedAnchors =
      anchorIntents.length <= maxFiles
        ? [...anchorIntents].sort((left, right) =>
            left.canonicalKey.localeCompare(right.canonicalKey),
          )
        : [...anchorIntents]
            .sort((left, right) => left.requestIndex - right.requestIndex)
            .slice(0, maxFiles);

    const deferredAnchors =
      anchorIntents.length > maxFiles
        ? [...anchorIntents]
            .sort((left, right) => left.requestIndex - right.requestIndex)
            .slice(maxFiles)
        : [];

    for (const intent of orderedAnchors) {
      const matching: ScopeFoldedSelectorCandidateViewV2[] = [];
      for (const candidate of facts.candidates) {
        if (candidate.matchedAnchorKeys.includes(intent.canonicalKey)) {
          matching.push(candidate);
        }
      }
      if (matching.length === 0) {
        reservations.push(
          Object.freeze({
            anchorKey: intent.canonicalKey,
            state: 'no-hit' as const,
            locatorRefs: Object.freeze([]),
          }),
        );
        continue;
      }
      const already = matching.find((candidate) =>
        selected.has(candidate.locatorRef),
      );
      if (already !== undefined) {
        reservations.push(
          Object.freeze({
            anchorKey: intent.canonicalKey,
            state: 'reserved' as const,
            locatorRefs: Object.freeze([already.locatorRef]),
          }),
        );
        continue;
      }
      const matchGroups = groupBySafeKey(matching);
      let reserved = false;
      for (const group of matchGroups.values()) {
        if (occupied + group.length > maxFiles) {
          filesTruncated = true;
          safeSelectionCollision = true;
          reservations.push(
            Object.freeze({
              anchorKey: intent.canonicalKey,
              state: 'budget-deferred' as const,
              locatorRefs: Object.freeze([]),
            }),
          );
          reserved = true;
          break;
        }
        occupied += group.length;
        const refs = group.map((candidate) => candidate.locatorRef);
        for (const ref of refs) {
          selected.add(ref);
        }
        reservations.push(
          Object.freeze({
            anchorKey: intent.canonicalKey,
            state: 'reserved' as const,
            locatorRefs: Object.freeze(refs),
          }),
        );
        reserved = true;
        break;
      }
      if (!reserved) {
        reservations.push(
          Object.freeze({
            anchorKey: intent.canonicalKey,
            state: 'budget-deferred' as const,
            locatorRefs: Object.freeze([]),
          }),
        );
      }
    }

    for (const intent of deferredAnchors) {
      reservations.push(
        Object.freeze({
          anchorKey: intent.canonicalKey,
          state: 'budget-deferred' as const,
          locatorRefs: Object.freeze([]),
        }),
      );
    }

    // 非 anchor 容量：按 safe 等价类补齐
    for (const group of groups.values()) {
      if (group.every((candidate) => selected.has(candidate.locatorRef))) {
        continue;
      }
      if (occupied + group.length > maxFiles) {
        filesTruncated = true;
        continue;
      }
      occupied += group.length;
      for (const candidate of group) {
        selected.add(candidate.locatorRef);
      }
    }

    const draft: SafeDiscoverySelectionDraftV2 = Object.freeze({
      selectorView,
      anchorKeys: Object.freeze(
        anchorIntents.map((intent) => intent.canonicalKey),
      ),
      selectedLocatorRefs: Object.freeze([...selected]),
      reservations: Object.freeze(reservations),
      filesTruncated,
      safeSelectionCollision,
    });
    return Object.freeze({ draft });
  }

  /**
   * 绑定 ticket/proof（零 I/O）。
   */
  public bind(
    selection: DiscoveryHitSelectionDraftV2,
    execution: LocateExecutionTokenV2,
  ): DiscoveryHitSelectionV2 {
    return Object.freeze({
      bound: bindDiscoverySelectionV2(selection.draft, execution),
    });
  }
}
