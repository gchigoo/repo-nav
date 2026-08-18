import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import type { DiscoveryLocatorRefV2 } from './discovery-lane-universe-v2.js';
import {
  readScopeFoldedSelectorFactsV2,
  type ScopeFoldedSelectorCandidateViewV2,
  type TrustedScopeFoldedSelectorViewV2,
} from './scope-folded-discovery-selector-v2.js';

declare const BOUND_SAFE_DISCOVERY_SELECTION_V2: unique symbol;
export type BoundSafeDiscoverySelectionV2 = Readonly<object> & {
  readonly [BOUND_SAFE_DISCOVERY_SELECTION_V2]: never;
};

declare const SAFE_DISCOVERY_SELECTION_PROOF_V2: unique symbol;
export type SafeDiscoverySelectionProofV2 = Readonly<object> & {
  readonly [SAFE_DISCOVERY_SELECTION_PROOF_V2]: never;
};

declare const DISCOVERY_TRACKING_TICKET_V2: unique symbol;
export type DiscoveryTrackingTicketV2 = Readonly<object> & {
  readonly [DISCOVERY_TRACKING_TICKET_V2]: never;
};

declare const SAFE_DISCOVERY_SELECTION_DRAFT_V2: unique symbol;
export type SafeDiscoverySelectionDraftV2 = Readonly<object> & {
  readonly [SAFE_DISCOVERY_SELECTION_DRAFT_V2]: never;
};

export interface SafeDiscoveryAnchorIntentV2 {
  readonly requestIndex: number;
  readonly canonicalKey: string;
}

export interface SafeDiscoveryAnchorReservationV2 {
  readonly anchorKey: string;
  readonly state: 'reserved' | 'no-hit' | 'budget-deferred';
  readonly locatorRefs: readonly DiscoveryLocatorRefV2[];
}

export interface SafeDiscoverySelectionFactsV2 {
  readonly selectorView: TrustedScopeFoldedSelectorViewV2;
  readonly anchorKeys: readonly string[];
  readonly selectedLocatorRefs: readonly DiscoveryLocatorRefV2[];
  readonly reservations: readonly SafeDiscoveryAnchorReservationV2[];
  readonly filesTruncated: boolean;
  readonly safeSelectionCollision: boolean;
  readonly maxFiles: number;
}

interface SelectionDraftRecordV2 {
  readonly facts: SafeDiscoverySelectionFactsV2;
  readonly execution: LocateExecutionTokenV2;
}

interface BoundSelectionRecordV2 {
  readonly draft: SafeDiscoverySelectionFactsV2;
  readonly proof: SafeDiscoverySelectionProofV2;
  readonly ticket: DiscoveryTrackingTicketV2;
  readonly execution: LocateExecutionTokenV2;
}

const selectionDraftRecords = new WeakMap<
  SafeDiscoverySelectionDraftV2,
  SelectionDraftRecordV2
>();
const boundSelectionRecords = new WeakMap<
  BoundSafeDiscoverySelectionV2,
  BoundSelectionRecordV2
>();

function safeSelectorKey(
  candidate: ScopeFoldedSelectorCandidateViewV2,
): string {
  return [
    candidate.safeKey.file,
    String(candidate.lineStart),
    String(candidate.lineEnd),
    candidate.safeKey.symbol,
    candidate.source,
  ].join('\u0001');
}

function compareSafeSelectorGroups(
  left: readonly ScopeFoldedSelectorCandidateViewV2[],
  right: readonly ScopeFoldedSelectorCandidateViewV2[],
): number {
  const bestRank = (
    group: readonly ScopeFoldedSelectorCandidateViewV2[],
  ): number =>
    Math.min(
      ...group.map(
        (candidate) => candidate.backendRank ?? Number.MAX_SAFE_INTEGER,
      ),
    );
  return (
    bestRank(left) - bestRank(right) ||
    safeSelectorKey(left[0]!).localeCompare(safeSelectorKey(right[0]!))
  );
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

function freezeReservationV2(
  anchorKey: string,
  state: SafeDiscoveryAnchorReservationV2['state'],
  locatorRefs: readonly DiscoveryLocatorRefV2[] = [],
): SafeDiscoveryAnchorReservationV2 {
  return Object.freeze({
    anchorKey,
    state,
    locatorRefs: Object.freeze([...locatorRefs]),
  });
}

function validateSelectionInputsV2(
  anchorIntents: readonly SafeDiscoveryAnchorIntentV2[],
  maxFiles: number,
): void {
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 0) {
    throw new TypeError('discovery selection maxFiles is invalid');
  }
  const keys = new Set<string>();
  const indexes = new Set<number>();
  for (const intent of anchorIntents) {
    if (
      !Number.isSafeInteger(intent.requestIndex) ||
      intent.requestIndex < 0 ||
      intent.canonicalKey.length === 0 ||
      keys.has(intent.canonicalKey) ||
      indexes.has(intent.requestIndex)
    ) {
      throw new TypeError('discovery selection anchor intent is invalid');
    }
    keys.add(intent.canonicalKey);
    indexes.add(intent.requestIndex);
  }
}

/**
 * 只从同 execution 的 trusted folded view 计算并签发 selection draft。
 */
export function createSafeDiscoverySelectionDraftV2(input: {
  readonly selectorView: TrustedScopeFoldedSelectorViewV2;
  readonly anchorIntents: readonly SafeDiscoveryAnchorIntentV2[];
  readonly maxFiles: number;
  readonly execution: LocateExecutionTokenV2;
}): SafeDiscoverySelectionDraftV2 {
  validateSelectionInputsV2(input.anchorIntents, input.maxFiles);
  const facts = readScopeFoldedSelectorFactsV2(
    input.selectorView,
    input.execution,
  );
  const groups = groupBySafeKey(facts.candidates);
  const selected = new Set<DiscoveryLocatorRefV2>();
  const reservations: SafeDiscoveryAnchorReservationV2[] = [];
  let occupied = 0;
  let filesTruncated = facts.filesTruncated;
  let safeSelectionCollision = facts.safeSelectionCollision;

  const orderedAnchors =
    input.anchorIntents.length <= input.maxFiles
      ? [...input.anchorIntents].sort((left, right) =>
          left.canonicalKey.localeCompare(right.canonicalKey),
        )
      : [...input.anchorIntents]
          .sort((left, right) => left.requestIndex - right.requestIndex)
          .slice(0, input.maxFiles);
  const deferredAnchors =
    input.anchorIntents.length > input.maxFiles
      ? [...input.anchorIntents]
          .sort((left, right) => left.requestIndex - right.requestIndex)
          .slice(input.maxFiles)
      : [];

  for (const intent of orderedAnchors) {
    const matching = facts.candidates.filter((candidate) =>
      candidate.matchedAnchorKeys.includes(intent.canonicalKey),
    );
    if (matching.length === 0) {
      reservations.push(freezeReservationV2(intent.canonicalKey, 'no-hit'));
      continue;
    }
    const already = matching.find((candidate) =>
      selected.has(candidate.locatorRef),
    );
    if (already !== undefined) {
      reservations.push(
        freezeReservationV2(intent.canonicalKey, 'reserved', [
          already.locatorRef,
        ]),
      );
      continue;
    }
    const matchGroups = [...groupBySafeKey(matching).values()].sort(
      compareSafeSelectorGroups,
    );
    let reserved = false;
    for (const group of matchGroups) {
      if (occupied + group.length > input.maxFiles) {
        filesTruncated = true;
        safeSelectionCollision = true;
        reservations.push(
          freezeReservationV2(intent.canonicalKey, 'budget-deferred'),
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
        freezeReservationV2(intent.canonicalKey, 'reserved', refs),
      );
      reserved = true;
      break;
    }
    if (!reserved) {
      reservations.push(
        freezeReservationV2(intent.canonicalKey, 'budget-deferred'),
      );
    }
  }

  for (const intent of deferredAnchors) {
    reservations.push(
      freezeReservationV2(intent.canonicalKey, 'budget-deferred'),
    );
  }

  const orderedGroups = [...groups.values()].sort(compareSafeSelectorGroups);
  for (const group of orderedGroups) {
    if (group.every((candidate) => selected.has(candidate.locatorRef))) {
      continue;
    }
    if (occupied + group.length > input.maxFiles) {
      filesTruncated = true;
      continue;
    }
    occupied += group.length;
    for (const candidate of group) {
      selected.add(candidate.locatorRef);
    }
  }

  const selectionFacts: SafeDiscoverySelectionFactsV2 = Object.freeze({
    selectorView: input.selectorView,
    anchorKeys: Object.freeze(
      input.anchorIntents.map((intent) => intent.canonicalKey),
    ),
    selectedLocatorRefs: Object.freeze([...selected]),
    reservations: Object.freeze([...reservations]),
    filesTruncated,
    safeSelectionCollision,
    maxFiles: input.maxFiles,
  });
  const draft = createOpaqueTokenV2<SafeDiscoverySelectionDraftV2>();
  selectionDraftRecords.set(
    draft,
    Object.freeze({ facts: selectionFacts, execution: input.execution }),
  );
  return draft;
}

export function requireSafeDiscoverySelectionDraftV2(
  draft: SafeDiscoverySelectionDraftV2,
  execution: LocateExecutionTokenV2,
): SafeDiscoverySelectionFactsV2 {
  const record = selectionDraftRecords.get(draft);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('discovery selection draft is not trusted');
  }
  return record.facts;
}

/**
 * 在任何 reader 调用前绑定 exact selection → ticket/proof。
 */
export function bindDiscoverySelectionV2(
  draft: SafeDiscoverySelectionDraftV2,
  execution: LocateExecutionTokenV2,
): BoundSafeDiscoverySelectionV2 {
  const draftRecord = selectionDraftRecords.get(draft);
  if (draftRecord === undefined || draftRecord.execution !== execution) {
    throw new TypeError('discovery selection draft is not trusted');
  }
  readScopeFoldedSelectorFactsV2(draftRecord.facts.selectorView, execution);
  const proof = createOpaqueTokenV2<SafeDiscoverySelectionProofV2>();
  const ticket = createOpaqueTokenV2<DiscoveryTrackingTicketV2>();
  const bound = createOpaqueTokenV2<BoundSafeDiscoverySelectionV2>();
  boundSelectionRecords.set(
    bound,
    Object.freeze({
      draft: draftRecord.facts,
      proof,
      ticket,
      execution,
    }),
  );
  return bound;
}

/**
 * Trust lookup：核对 bound selection 与 execution。
 */
export function requireBoundDiscoverySelectionV2(
  bound: BoundSafeDiscoverySelectionV2,
  execution: LocateExecutionTokenV2,
): BoundSelectionRecordV2 {
  const record = boundSelectionRecords.get(bound);
  if (record === undefined || record.execution !== execution) {
    throw new TypeError('discovery selection binding is not trusted');
  }
  return record;
}

export function readBoundSelectionProofV2(
  bound: BoundSafeDiscoverySelectionV2,
  execution: LocateExecutionTokenV2,
): SafeDiscoverySelectionProofV2 {
  return requireBoundDiscoverySelectionV2(bound, execution).proof;
}
