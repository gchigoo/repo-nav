import {
  createDiscoveryKey,
  type CandidateEvidence,
  type ConfirmedEvidence,
  type LocateStatus,
} from '../../contracts/index.js';
import type { DiscoveryRecord } from '../discovery-record.js';
import type { CanonicalFileKeyV2 } from './canonical-file-identity-v2.js';
import type { UnsafeEvidenceDraftV2 } from './classified-evidence-record-v2.js';
import type { PreRankingPoolInputRecordV2 } from './pre-ranking-evidence-pool-v2.js';

function toUnsafeDraftV2(
  evidence: ConfirmedEvidence | CandidateEvidence,
): UnsafeEvidenceDraftV2 {
  if (evidence.evidenceClass === 'confirmed') {
    return Object.freeze({
      evidenceClass: 'confirmed' as const,
      role: evidence.role,
      location: evidence.location,
      provenance: evidence.provenance,
      reasonCodes: evidence.reasonCodes,
    });
  }
  return Object.freeze({
    evidenceClass: 'candidate' as const,
    role: evidence.role,
    location: evidence.location,
    provenance: evidence.provenance,
    reasonCodes: evidence.reasonCodes,
    promotionRequirements: evidence.promotionRequirements,
  });
}

/**
 * 从 merge records + legacy drafts 构造 pre-ranking 双池输入（final check 前）。
 */
export function buildPreRankingPoolInputsFromLegacyEvidenceV2(input: {
  readonly discoveryRecords: readonly DiscoveryRecord[];
  readonly confirmed: readonly ConfirmedEvidence[];
  readonly candidates: readonly CandidateEvidence[];
  readonly canonicalFileKeyFor: (
    locator: string,
  ) => CanonicalFileKeyV2 | undefined;
}): readonly PreRankingPoolInputRecordV2[] {
  const draftByKey = new Map<string, UnsafeEvidenceDraftV2>();
  for (const evidence of input.confirmed) {
    draftByKey.set(
      createDiscoveryKey(evidence.location),
      toUnsafeDraftV2(evidence),
    );
  }
  for (const evidence of input.candidates) {
    draftByKey.set(
      createDiscoveryKey(evidence.location),
      toUnsafeDraftV2(evidence),
    );
  }

  const resolveKey = (locator: string): CanonicalFileKeyV2 =>
    input.canonicalFileKeyFor(locator) ?? (locator as CanonicalFileKeyV2);

  const inputs: PreRankingPoolInputRecordV2[] = [];
  const seen = new Set<string>();

  for (const record of input.discoveryRecords) {
    seen.add(record.discoveryKey);
    const draft = draftByKey.get(record.discoveryKey);
    inputs.push(
      Object.freeze({
        discoveryKey: record.discoveryKey,
        canonicalFileKey: resolveKey(record.location.file),
        safeKey: record.discoveryKey,
        ...(draft === undefined ? {} : { draft }),
        rankingSignals: Object.freeze({
          kind: 'direct' as const,
          focusLines: record.focusLines,
          focusExcerpt: record.focusExcerpt,
        }),
        classificationDefined: draft !== undefined,
      }),
    );
  }

  for (const [discoveryKey, draft] of draftByKey) {
    if (seen.has(discoveryKey)) {
      continue;
    }
    inputs.push(
      Object.freeze({
        discoveryKey,
        canonicalFileKey: resolveKey(draft.location.file),
        safeKey: discoveryKey,
        draft,
        rankingSignals: Object.freeze({
          kind: 'derived' as const,
          focusLines: draft.location.lines,
          focusExcerpt: draft.location.excerpt,
        }),
        classificationDefined: true,
      }),
    );
  }

  return Object.freeze(inputs);
}

/**
 * 按 changed canonical keys purge v1 evidence（不补位）。
 */
export function purgeLegacyEvidenceByChangedKeysV2<
  T extends ConfirmedEvidence | CandidateEvidence,
>(
  evidence: readonly T[],
  changedCanonicalKeys: ReadonlySet<string>,
  canonicalFileKeyFor: (locator: string) => CanonicalFileKeyV2 | undefined,
): readonly T[] {
  return Object.freeze(
    evidence.filter((item) => {
      const key = canonicalFileKeyFor(item.location.file) ?? item.location.file;
      return !changedCanonicalKeys.has(key);
    }),
  );
}

/**
 * mutation → 至少 partial；timeout 优先；不引入 SNAPSHOT_CHANGED。
 */
export function applyMutationStatusPrecedenceV2(
  status: LocateStatus,
  consistency: 'stable' | 'changed' | 'unknown',
): LocateStatus {
  if (status === 'timeout' || consistency !== 'changed') {
    return status;
  }
  if (
    status === 'ok' ||
    status === 'no_result' ||
    status === 'backend_unavailable'
  ) {
    return 'partial';
  }
  return status;
}
