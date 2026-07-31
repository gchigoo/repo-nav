import type { SnapshotFactsV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import {
  fileIdentitiesEqualV2,
  resolveCanonicalTargetV2,
  type CanonicalFileKeyV2,
  type FileIdentityV2,
} from './canonical-file-identity-v2.js';
import type {
  InternalPreRankingEvidenceRecordV2,
  PreFinalEligibleDiscoveryPoolV2,
  PreFinalEligibleDiscoveryRecordV2,
  PreRankingEvidencePoolV2,
} from './pre-ranking-evidence-pool-v2.js';
import type { RepositoryGitStateV2 } from './repository-git-state-probe-v2.js';
import { createOpaqueTokenV2 } from './opaque-token-v2.js';

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
  readonly identity: FileIdentityV2;
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

export type FinalCheckConsistencyV2 = 'stable' | 'changed' | 'unknown';

/**
 * Final check：按 canonical key 排序复核 identity/alias；changed 整文件 purge 双池。
 */
export async function runFinalSnapshotCheckV2(input: {
  readonly repositoryRoot: string;
  readonly loadedFiles: readonly LoadedCanonicalFileV2[];
  readonly evidencePool: PreRankingEvidencePoolV2;
  readonly eligiblePool: PreFinalEligibleDiscoveryPoolV2;
  readonly gitState: RepositoryGitStateV2;
  readonly signal: AbortSignal;
}): Promise<TrustedFinalSnapshotPoolsV2> {
  const changed = new Set<string>();
  let filesChecked = 0;

  const sorted = [...input.loadedFiles].sort((left, right) =>
    left.canonicalFileKey < right.canonicalFileKey
      ? -1
      : left.canonicalFileKey > right.canonicalFileKey
        ? 1
        : 0,
  );

  for (const loaded of sorted) {
    // abort：仅尚未复核的 canonical key 记 changed；已成功复核的保留
    if (input.signal.aborted) {
      changed.add(loaded.canonicalFileKey);
      continue;
    }
    try {
      let aliasMismatch = false;
      for (const alias of loaded.aliases) {
        if (input.signal.aborted) {
          changed.add(loaded.canonicalFileKey);
          aliasMismatch = true;
          break;
        }
        const resolved = await resolveCanonicalTargetV2(
          input.repositoryRoot,
          alias,
          input.signal,
        );
        if (
          resolved.canonicalFileKey !== loaded.canonicalFileKey ||
          !fileIdentitiesEqualV2(resolved.identity, loaded.identity)
        ) {
          aliasMismatch = true;
          break;
        }
      }
      if (aliasMismatch) {
        changed.add(loaded.canonicalFileKey);
        continue;
      }
      if (input.signal.aborted) {
        changed.add(loaded.canonicalFileKey);
        continue;
      }
      const recheck = await resolveCanonicalTargetV2(
        input.repositoryRoot,
        loaded.aliases[0] ?? loaded.canonicalFileKey,
        input.signal,
      );
      if (
        recheck.canonicalFileKey !== loaded.canonicalFileKey ||
        !fileIdentitiesEqualV2(recheck.identity, loaded.identity)
      ) {
        changed.add(loaded.canonicalFileKey);
        continue;
      }
      filesChecked += 1;
      afterSuccessfulFinalFileCheckForTestV2?.();
    } catch {
      changed.add(loaded.canonicalFileKey);
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
  if (input.loadedFiles.length === 0 && retainedEvidence.length === 0) {
    consistency = 'unknown';
  } else if (changed.size > 0) {
    consistency = 'changed';
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
