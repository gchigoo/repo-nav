import type {
  BackendHit,
  RepositoryAccessErrorCode,
} from '../../contracts/index.js';
import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  bindRawDiscoveryLocatorV2,
  type DiscoveryLocatorRefV2,
} from './discovery-lane-universe-v2.js';
import {
  requireBoundDiscoverySelectionV2,
  type BoundSafeDiscoverySelectionV2,
} from './discovery-selection-binding-v2.js';
import {
  requireSnapshotTrustProofForSelectedVerificationV2,
  type SnapshotTrustProofV2,
} from './final-snapshot-check-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

declare const SELECTED_VERIFICATION_OUTCOME_V2: unique symbol;
export type SelectedVerificationOutcomeV2 = Readonly<object> & {
  readonly [SELECTED_VERIFICATION_OUTCOME_V2]: never;
};

declare const SNAPSHOT_BOUND_SELECTED_VERIFICATION_OUTCOME_V2: unique symbol;
export type SnapshotBoundSelectedVerificationOutcomeV2 = Readonly<object> & {
  readonly [SNAPSHOT_BOUND_SELECTED_VERIFICATION_OUTCOME_V2]: never;
};

export interface SelectedVerificationOutcomeFactsV2 {
  readonly readLimits: Readonly<{
    readonly maximumFileBytesReached: boolean;
    readonly maximumExcerptBytesReached: boolean;
  }>;
  readonly exclusions: Readonly<{
    readonly duplicateLocations: number;
    readonly unverifiedFileContent: number;
  }>;
}

interface SelectedVerificationRecordV2 {
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly execution: LocateExecutionTokenV2;
  readonly facts: SelectedVerificationOutcomeFactsV2;
}

interface SnapshotBoundSelectedVerificationRecordV2 extends SelectedVerificationRecordV2 {
  readonly snapshotProof: SnapshotTrustProofV2;
}

const selectedVerificationRecords = new WeakMap<
  SelectedVerificationOutcomeV2,
  SelectedVerificationRecordV2
>();
const snapshotBoundRecords = new WeakMap<
  SnapshotBoundSelectedVerificationOutcomeV2,
  SnapshotBoundSelectedVerificationRecordV2
>();

function assertSafeCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
}

function locatorRefForHitV2(
  hit: BackendHit,
  execution: LocateExecutionTokenV2,
): DiscoveryLocatorRefV2 {
  const locatorRef = bindRawDiscoveryLocatorV2(
    {
      source: 'backend',
      backend: hit.source,
      pathFlavor: 'native',
      rawPath: hit.file,
    },
    execution,
  );
  if (locatorRef === undefined) {
    throw new TypeError('selected verification hit locator is invalid');
  }
  return locatorRef;
}

function sameRefSetV2(
  left: ReadonlySet<DiscoveryLocatorRefV2>,
  right: ReadonlySet<DiscoveryLocatorRefV2>,
): boolean {
  return (
    left.size === right.size &&
    [...left].every((locatorRef) => right.has(locatorRef))
  );
}

/**
 * Issue an outcome only when the verified hits exactly cover one trusted,
 * scope-folded discovery selection from the same execution.
 */
export function createSelectedVerificationOutcomeV2(input: {
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly execution: LocateExecutionTokenV2;
  readonly hits: readonly BackendHit[];
  readonly observedLocatorRefs: ReadonlySet<DiscoveryLocatorRefV2>;
  readonly unverifiedLocatorRefs: ReadonlySet<DiscoveryLocatorRefV2>;
  readonly duplicateLocations: number;
  readonly failureCodes: readonly RepositoryAccessErrorCode[];
}): SelectedVerificationOutcomeV2 {
  assertSafeCount(input.duplicateLocations, 'duplicateLocations');
  const selection = requireBoundDiscoverySelectionV2(
    input.boundSelection,
    input.execution,
  );
  const selectedRefs = new Set(selection.draft.selectedLocatorRefs);
  const hitRefs = new Set(
    input.hits.map((hit) => locatorRefForHitV2(hit, input.execution)),
  );
  if (selectedRefs.size === 0 || !sameRefSetV2(selectedRefs, hitRefs)) {
    throw new TypeError('selected verification hits do not match selection');
  }
  const outcomes = new Set([
    ...input.observedLocatorRefs,
    ...input.unverifiedLocatorRefs,
  ]);
  if (
    [...input.observedLocatorRefs].some((ref) =>
      input.unverifiedLocatorRefs.has(ref),
    ) ||
    !sameRefSetV2(hitRefs, outcomes)
  ) {
    throw new TypeError(
      'selected verification locator outcomes are incomplete',
    );
  }

  const facts = Object.freeze({
    readLimits: Object.freeze({
      maximumFileBytesReached: input.failureCodes.includes(
        'MAX_FILE_BYTES_REACHED',
      ),
      maximumExcerptBytesReached: input.failureCodes.includes(
        'MAX_EXCERPT_BYTES_REACHED',
      ),
    }),
    exclusions: Object.freeze({
      duplicateLocations: input.duplicateLocations,
      unverifiedFileContent: input.unverifiedLocatorRefs.size,
    }),
  });
  const outcome = createOpaqueTokenV2<SelectedVerificationOutcomeV2>();
  selectedVerificationRecords.set(
    outcome,
    Object.freeze({
      boundSelection: input.boundSelection,
      execution: input.execution,
      facts,
    }),
  );
  return outcome;
}

/** Bind one selected verification outcome to the exact successful final check. */
export function bindSelectedVerificationOutcomeToSnapshotV2(input: {
  readonly outcome: SelectedVerificationOutcomeV2;
  readonly boundSelection: BoundSafeDiscoverySelectionV2;
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
}): SnapshotBoundSelectedVerificationOutcomeV2 {
  const record = selectedVerificationRecords.get(input.outcome);
  if (
    record === undefined ||
    record.boundSelection !== input.boundSelection ||
    record.execution !== input.execution
  ) {
    throw new TypeError('selected verification outcome binding mismatch');
  }
  requireSnapshotTrustProofForSelectedVerificationV2(
    input.snapshotProof,
    input.boundSelection,
    input.outcome,
    input.execution,
  );
  const bound =
    createOpaqueTokenV2<SnapshotBoundSelectedVerificationOutcomeV2>();
  snapshotBoundRecords.set(
    bound,
    Object.freeze({ ...record, snapshotProof: input.snapshotProof }),
  );
  return bound;
}

/** Read selected verification facts only with all original authorities. */
export function requireSnapshotBoundSelectedVerificationOutcomeV2(
  outcome: SnapshotBoundSelectedVerificationOutcomeV2,
  boundSelection: BoundSafeDiscoverySelectionV2,
  snapshotProof: SnapshotTrustProofV2,
  execution: LocateExecutionTokenV2,
): SelectedVerificationOutcomeFactsV2 {
  const record = snapshotBoundRecords.get(outcome);
  if (
    record === undefined ||
    record.boundSelection !== boundSelection ||
    record.snapshotProof !== snapshotProof ||
    record.execution !== execution
  ) {
    throw new TypeError(
      'snapshot-bound selected verification outcome mismatch',
    );
  }
  return record.facts;
}
