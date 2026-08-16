import type {
  LocateExecutionTokenV2,
  SnapshotFactsV2,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  fileIdentitiesEqualV2,
  readVerifiedFileV2,
  verifiedFileSnapshotsEqualV2,
  verifyVerifiedFileMetadataV2,
  type CanonicalFileKeyV2,
  type ReadVerifiedFileInputV2,
  type VerifiedFileMetadataV2,
  type VerifiedFileReadV2,
  type VerifiedFileSnapshotV2,
  type VerifyVerifiedFileMetadataInputV2,
} from '../../repository/verified-file-snapshot-v2.js';
import type {
  InternalPreRankingEvidenceRecordV2,
  PreFinalEligibleDiscoveryPoolV2,
  PreFinalEligibleDiscoveryRecordV2,
  PreRankingEvidencePoolV2,
} from './pre-ranking-evidence-pool-v2.js';
import type { RepositoryGitStateV2 } from './repository-git-state-probe-v2.js';
import type { BoundSafeDiscoverySelectionV2 } from './discovery-selection-binding-v2.js';
import type { SelectedVerificationOutcomeV2 } from './selected-verification-outcome-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';
import { createSnapshotRevalidationPlanV2 } from './snapshot-revalidation-policy-v2.js';
import { SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2 } from './selected-snapshot-revalidation-policy-v2.js';

declare const SNAPSHOT_TRUST_PROOF_V2: unique symbol;
export type SnapshotTrustProofV2 = Readonly<object> & {
  readonly [SNAPSHOT_TRUST_PROOF_V2]: never;
};

declare const TRUSTED_STABLE_EVIDENCE_POOL_V2: unique symbol;
export type TrustedStableEvidencePoolV2 = Readonly<object> & {
  readonly [TRUSTED_STABLE_EVIDENCE_POOL_V2]: never;
};

declare const TRUSTED_STABLE_ELIGIBLE_DISCOVERY_POOL_V2: unique symbol;
export type TrustedStableEligibleDiscoveryPoolV2 = Readonly<object> & {
  readonly [TRUSTED_STABLE_ELIGIBLE_DISCOVERY_POOL_V2]: never;
};

export interface LoadedCanonicalFileV2 {
  readonly canonicalFileKey: CanonicalFileKeyV2;
  readonly snapshot: VerifiedFileSnapshotV2;
  readonly aliases: readonly string[];
}

export interface TrustedFinalSnapshotPoolsV2 {
  readonly evidence: TrustedStableEvidencePoolV2;
  readonly eligibleDiscovery: TrustedStableEligibleDiscoveryPoolV2;
  readonly facts: SnapshotFactsV2;
  readonly proof: SnapshotTrustProofV2;
  readonly changedCanonicalKeys: ReadonlySet<string>;
  readonly discardedEvidenceCount: number;
  readonly retainedEvidence: readonly InternalPreRankingEvidenceRecordV2[];
  readonly retainedEligible: readonly PreFinalEligibleDiscoveryRecordV2[];
}

interface StablePoolPrivateV2 {
  readonly evidence: readonly InternalPreRankingEvidenceRecordV2[];
  readonly eligible: readonly PreFinalEligibleDiscoveryRecordV2[];
  readonly facts: SnapshotFactsV2;
  readonly changedCanonicalKeys: ReadonlySet<string>;
  readonly execution: LocateExecutionTokenV2;
  readonly boundSelection?: BoundSafeDiscoverySelectionV2;
  readonly selectedVerificationOutcome?: SelectedVerificationOutcomeV2;
}

const trustRecords = new WeakMap<SnapshotTrustProofV2, StablePoolPrivateV2>();
const evidencePoolPrivate = new WeakMap<
  TrustedStableEvidencePoolV2,
  SnapshotTrustProofV2
>();
const eligiblePoolPrivate = new WeakMap<
  TrustedStableEligibleDiscoveryPoolV2,
  SnapshotTrustProofV2
>();

/** 测试 seam：成功复核一个文件后回调（用于 mid-abort fixture）。 */
let afterSuccessfulFinalFileCheckForTestV2: (() => void) | undefined;

/**
 * 仅测试：在成功复核一个 canonical file 后触发；生产勿用。
 */
export function setAfterSuccessfulFinalFileCheckForTestV2(
  hook: (() => void) | undefined,
): void {
  afterSuccessfulFinalFileCheckForTestV2 = hook;
}

/**
 * proof 是否已由同次 final check 登记。
 */
export function isRegisteredSnapshotTrustProofV2(
  proof: SnapshotTrustProofV2,
): boolean {
  return trustRecords.has(proof);
}

export function isSnapshotTrustProofForExecutionV2(
  proof: SnapshotTrustProofV2,
  execution: LocateExecutionTokenV2,
): boolean {
  return trustRecords.get(proof)?.execution === execution;
}

export function requireSnapshotTrustProofForSelectedVerificationV2(
  proof: SnapshotTrustProofV2,
  boundSelection: BoundSafeDiscoverySelectionV2,
  selectedVerificationOutcome: SelectedVerificationOutcomeV2,
  execution: LocateExecutionTokenV2,
): void {
  const record = trustRecords.get(proof);
  if (
    record === undefined ||
    record.execution !== execution ||
    record.boundSelection !== boundSelection ||
    record.selectedVerificationOutcome !== selectedVerificationOutcome
  ) {
    throw new TypeError('snapshot trust proof selection binding mismatch');
  }
}

/**
 * 读取与 exact pool/proof 绑定的 retained eligible records。
 */
export function requireTrustedStableEligibleDiscoveryRecordsV2(
  pool: TrustedStableEligibleDiscoveryPoolV2,
  proof: SnapshotTrustProofV2,
): readonly PreFinalEligibleDiscoveryRecordV2[] {
  const record = trustRecords.get(proof);
  if (record === undefined || eligiblePoolPrivate.get(pool) !== proof) {
    throw new TypeError('stable eligible pool/proof mismatch');
  }
  return record.eligible;
}

export type FinalCheckConsistencyV2 = 'stable' | 'changed' | 'unknown';

function safeMaxFileBytesV2(size: bigint): number {
  if (size >= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(1, Number(size));
}

/**
 * Final check：按 canonical key 排序复核 verified snapshot；changed 整文件 purge 双池。
 */
export async function runFinalSnapshotCheckV2(input: {
  readonly repositoryRoot: string;
  readonly loadedFiles: readonly LoadedCanonicalFileV2[];
  readonly invalidatedCanonicalKeys?: ReadonlySet<CanonicalFileKeyV2>;
  readonly evidencePool: PreRankingEvidencePoolV2;
  readonly eligiblePool: PreFinalEligibleDiscoveryPoolV2;
  readonly gitState: RepositoryGitStateV2;
  readonly snapshotRef?: string;
  readonly signal: AbortSignal;
  readonly execution: LocateExecutionTokenV2;
  readonly boundSelection?: BoundSafeDiscoverySelectionV2;
  readonly selectedVerificationOutcome?: SelectedVerificationOutcomeV2;
  readonly readVerifiedFile?: (
    input: ReadVerifiedFileInputV2,
  ) => Promise<VerifiedFileReadV2>;
  readonly verifyVerifiedFileMetadata?: (
    input: VerifyVerifiedFileMetadataInputV2,
  ) => Promise<VerifiedFileMetadataV2>;
}): Promise<TrustedFinalSnapshotPoolsV2> {
  if (
    (input.boundSelection === undefined) !==
    (input.selectedVerificationOutcome === undefined)
  ) {
    throw new TypeError(
      'final snapshot selected verification authorities are incomplete',
    );
  }
  const changed = new Set<string>(input.invalidatedCanonicalKeys);
  const loadedCanonicalKeys = new Set(
    input.loadedFiles.map((loaded) => loaded.canonicalFileKey),
  );
  for (const record of input.evidencePool.records) {
    if (!loadedCanonicalKeys.has(record.canonicalFileKey)) {
      changed.add(record.canonicalFileKey);
    }
  }
  for (const record of input.eligiblePool.records) {
    if (!loadedCanonicalKeys.has(record.canonicalFileKey)) {
      changed.add(record.canonicalFileKey);
    }
  }
  let filesChecked = 0;
  const plan = createSnapshotRevalidationPlanV2(
    SELECTED_SNAPSHOT_REVALIDATION_POLICY_V2,
    {
      loadedCanonicalKeys: input.loadedFiles.map(
        ({ canonicalFileKey }) => canonicalFileKey,
      ),
      retainedEvidenceCanonicalKeys: input.evidencePool.records.map(
        ({ canonicalFileKey }) => canonicalFileKey,
      ),
      eligibleCanonicalKeys: input.eligiblePool.records.map(
        ({ canonicalFileKey }) => canonicalFileKey,
      ),
      gitState: input.gitState,
    },
  );
  const digestCanonicalKeys = new Set(plan.digestCanonicalKeys);
  const loadedByCanonicalKey = new Map(
    input.loadedFiles.map((loaded) => [loaded.canonicalFileKey, loaded]),
  );

  for (const canonicalFileKey of plan.metadataCanonicalKeys) {
    const loaded = loadedByCanonicalKey.get(canonicalFileKey);
    if (loaded === undefined) {
      changed.add(canonicalFileKey);
      continue;
    }
    // abort：仅尚未复核的 canonical key 记 changed；已成功复核的保留
    if (input.signal.aborted) {
      changed.add(canonicalFileKey);
      continue;
    }
    try {
      const readVerifiedFile = input.readVerifiedFile ?? readVerifiedFileV2;
      const verifyMetadata =
        input.verifyVerifiedFileMetadata ?? verifyVerifiedFileMetadataV2;
      const locators =
        loaded.aliases.length > 0
          ? loaded.aliases
          : Object.freeze([loaded.canonicalFileKey]);
      const requiresDigest = digestCanonicalKeys.has(canonicalFileKey);
      let stable = true;
      for (const locator of locators) {
        if (input.signal.aborted) {
          stable = false;
          break;
        }
        if (requiresDigest) {
          const reverified = await readVerifiedFile({
            repositoryRoot: input.repositoryRoot,
            locator,
            maxFileBytes: safeMaxFileBytesV2(loaded.snapshot.identity.size),
            signal: input.signal,
          });
          if (
            !verifiedFileSnapshotsEqualV2(reverified.snapshot, loaded.snapshot)
          ) {
            stable = false;
            break;
          }
          continue;
        }
        const metadata = await verifyMetadata({
          repositoryRoot: input.repositoryRoot,
          locator,
          signal: input.signal,
        });
        if (
          metadata.canonicalFileKey !== loaded.snapshot.canonicalFileKey ||
          !fileIdentitiesEqualV2(metadata.identity, loaded.snapshot.identity)
        ) {
          stable = false;
          break;
        }
      }
      if (!stable || input.signal.aborted) {
        changed.add(canonicalFileKey);
        continue;
      }
      filesChecked += 1;
      afterSuccessfulFinalFileCheckForTestV2?.();
    } catch {
      changed.add(canonicalFileKey);
    }
  }

  const retainedEvidence = input.evidencePool.records.filter(
    (record) => !changed.has(record.canonicalFileKey),
  );
  const purgedEvidence = input.evidencePool.records.filter((record) =>
    changed.has(record.canonicalFileKey),
  );
  const retainedEligible = input.eligiblePool.records.filter(
    (record) => !changed.has(record.canonicalFileKey),
  );

  const discardedEvidenceCount = new Set(
    purgedEvidence.map((record) => record.discoveryKey),
  ).size;

  let consistency: FinalCheckConsistencyV2;
  if (changed.size > 0) {
    consistency = 'changed';
  } else if (
    plan.metadataCanonicalKeys.length === 0 &&
    retainedEvidence.length === 0
  ) {
    consistency = 'unknown';
  } else {
    consistency = 'stable';
  }

  // unknown 不得与 retained draft 共存
  if (consistency === 'unknown' && retainedEvidence.length > 0) {
    consistency = 'changed';
  }

  const finalStableEvidence = Object.freeze(
    retainedEvidence
      .map((record) => record.draft)
      .filter((draft) => draft !== undefined)
      .map((draft) => {
        // SnapshotFacts 使用 contracts UnsafeEvidenceDraft（含 resolvable）
        if (draft.evidenceClass === 'confirmed') {
          return Object.freeze({
            ...draft,
            location: Object.freeze({
              ...draft.location,
              resolvable: true as const,
            }),
          });
        }
        return Object.freeze({
          ...draft,
          location: Object.freeze({
            ...draft.location,
            resolvable: true as const,
          }),
        });
      }),
  ) as SnapshotFactsV2['finalStableEvidence'];

  const facts: SnapshotFactsV2 = Object.freeze({
    coverage: Object.freeze({
      gitState: input.gitState,
      consistency,
      filesChecked,
      discardedEvidenceCount,
      ...(input.snapshotRef !== undefined && input.snapshotRef.length > 0
        ? { snapshotRef: input.snapshotRef }
        : {}),
    }),
    finalStableEvidence,
  });

  const proof = createOpaqueTokenV2<SnapshotTrustProofV2>();
  const evidence = createOpaqueTokenV2<TrustedStableEvidencePoolV2>();
  const eligibleDiscovery =
    createOpaqueTokenV2<TrustedStableEligibleDiscoveryPoolV2>();

  trustRecords.set(
    proof,
    Object.freeze({
      evidence: Object.freeze(retainedEvidence),
      eligible: Object.freeze(retainedEligible),
      facts,
      changedCanonicalKeys: changed,
      execution: input.execution,
      ...(input.boundSelection === undefined
        ? {}
        : { boundSelection: input.boundSelection }),
      ...(input.selectedVerificationOutcome === undefined
        ? {}
        : { selectedVerificationOutcome: input.selectedVerificationOutcome }),
    }),
  );
  evidencePoolPrivate.set(evidence, proof);
  eligiblePoolPrivate.set(eligibleDiscovery, proof);

  return Object.freeze({
    evidence,
    eligibleDiscovery,
    facts,
    proof,
    changedCanonicalKeys: changed,
    discardedEvidenceCount,
    retainedEvidence: Object.freeze(retainedEvidence),
    retainedEligible: Object.freeze(retainedEligible),
  });
}

/**
 * Trust lookup：proof 必须匹配 pool。
 */
export function requireTrustedSnapshotPoolsV2(
  proof: SnapshotTrustProofV2,
  evidence: TrustedStableEvidencePoolV2,
  eligible: TrustedStableEligibleDiscoveryPoolV2,
): StablePoolPrivateV2 {
  const record = trustRecords.get(proof);
  if (record === undefined) {
    throw new TypeError('snapshot trust proof is not registered');
  }
  if (
    evidencePoolPrivate.get(evidence) !== proof ||
    eligiblePoolPrivate.get(eligible) !== proof
  ) {
    throw new TypeError('snapshot pool/proof mismatch');
  }
  return record;
}

export function snapshotTrustProofOwnKeysV2(
  proof: SnapshotTrustProofV2,
): readonly string[] {
  return Object.keys(proof);
}
