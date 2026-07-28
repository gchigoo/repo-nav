import { z } from 'zod';

import type { LocateExecutionTokenV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  isRegisteredSnapshotTrustProofV2,
  type SnapshotTrustProofV2,
} from './final-snapshot-check-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

export const SnapshotOutcomeContributionV2Schema = z
  .object({
    owner: z.literal('snapshot-observation'),
    readLimits: z
      .object({
        maxFileBytesReached: z.boolean(),
        maxExcerptBytesReached: z.boolean(),
      })
      .strict(),
    exclusions: z
      .object({
        negativeTermMatchCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
        duplicateLocationCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
        unverifiedFileContentCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
        snapshotChangedCount: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER),
      })
      .strict(),
  })
  .strict();

type DeepReadonlyV2<T> = T extends readonly unknown[]
  ? { readonly [K in keyof T]: DeepReadonlyV2<T[K]> }
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonlyV2<T[K]> }
    : T;

export type SnapshotOutcomeContributionV2 = DeepReadonlyV2<
  z.output<typeof SnapshotOutcomeContributionV2Schema>
>;

declare const SNAPSHOT_OUTCOME_CONTRIBUTION_TOKEN_V2: unique symbol;
export type SnapshotOutcomeContributionTokenV2 = Readonly<object> & {
  readonly [SNAPSHOT_OUTCOME_CONTRIBUTION_TOKEN_V2]: never;
};

interface ContributionPrivateV2 {
  readonly contribution: SnapshotOutcomeContributionV2;
  readonly proof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
}

const contributionPrivate = new WeakMap<
  SnapshotOutcomeContributionTokenV2,
  ContributionPrivateV2
>();

export interface SnapshotObservationLedgerEntryInputV2 {
  readonly selected: boolean;
  readonly scopeIncluded: boolean;
  readonly maxFileBytesReached: boolean;
  readonly maxExcerptBytesReached: boolean;
  readonly negativeExcluded: boolean;
  readonly duplicateExtraCount: number;
  readonly unverifiedOrdinary: boolean;
}

/**
 * 从完整 ledger + discardedEvidenceCount 签发 contribution；深冻结并绑定 proof。
 */
export function createSnapshotOutcomeContributionV2(input: {
  readonly snapshotProof: SnapshotTrustProofV2;
  readonly execution: LocateExecutionTokenV2;
  readonly discardedEvidenceCount: number;
  readonly ledger: readonly SnapshotObservationLedgerEntryInputV2[];
}): SnapshotOutcomeContributionTokenV2 {
  if (!isRegisteredSnapshotTrustProofV2(input.snapshotProof)) {
    throw new TypeError(
      'snapshot outcome contribution requires registered final-check proof',
    );
  }
  let maxFileBytesReached = false;
  let maxExcerptBytesReached = false;
  let negativeTermMatchCount = 0;
  let duplicateLocationCount = 0;
  let unverifiedFileContentCount = 0;

  for (const entry of input.ledger) {
    if (!entry.scopeIncluded || !entry.selected) {
      continue;
    }
    maxFileBytesReached = maxFileBytesReached || entry.maxFileBytesReached;
    maxExcerptBytesReached =
      maxExcerptBytesReached || entry.maxExcerptBytesReached;
    if (entry.negativeExcluded) {
      negativeTermMatchCount += 1;
    }
    duplicateLocationCount += Math.max(0, entry.duplicateExtraCount);
    if (entry.unverifiedOrdinary) {
      unverifiedFileContentCount += 1;
    }
  }

  const raw = {
    owner: 'snapshot-observation' as const,
    readLimits: {
      maxFileBytesReached,
      maxExcerptBytesReached,
    },
    exclusions: {
      negativeTermMatchCount,
      duplicateLocationCount,
      unverifiedFileContentCount,
      snapshotChangedCount: input.discardedEvidenceCount,
    },
  };
  const parsed = SnapshotOutcomeContributionV2Schema.parse(raw);
  const contribution = Object.freeze({
    owner: parsed.owner,
    readLimits: Object.freeze({ ...parsed.readLimits }),
    exclusions: Object.freeze({ ...parsed.exclusions }),
  });

  const token = createOpaqueTokenV2<SnapshotOutcomeContributionTokenV2>();
  contributionPrivate.set(
    token,
    Object.freeze({
      contribution,
      proof: input.snapshotProof,
      execution: input.execution,
    }),
  );
  return token;
}

/**
 * F6 accessor：same proof/execution 才可读值。
 */
export function requireSnapshotOutcomeContributionV2(
  token: SnapshotOutcomeContributionTokenV2,
  expectedProof: SnapshotTrustProofV2,
  expectedExecution: LocateExecutionTokenV2,
): SnapshotOutcomeContributionV2 {
  const record = contributionPrivate.get(token);
  if (
    record === undefined ||
    record.proof !== expectedProof ||
    record.execution !== expectedExecution
  ) {
    throw new TypeError('snapshot outcome contribution trust mismatch');
  }
  return record.contribution;
}
