import { describe, expect, it } from 'vitest';

import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import {
  runFinalSnapshotCheckV2,
  type SnapshotTrustProofV2,
} from '../../src/evidence/request-snapshot/final-snapshot-check-v2.js';
import {
  createSnapshotOutcomeContributionV2,
  requireSnapshotOutcomeContributionV2,
} from '../../src/evidence/request-snapshot/snapshot-outcome-contribution-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'request-snapshot-cache',
  caseId: 'snapshot-outcome-contribution',
});

describe.runIf(selected)('F3-OUTCOME-001 snapshot-outcome-contribution', () => {
  it('derives counts from ledger and rejects unregistered handcrafted proof', async () => {
    const execution = requireLocateProjectionExecutionTokenV2(
      issueLocateProjectionExecutionCapabilityV2(),
    );
    const registered = await runFinalSnapshotCheckV2({
      repositoryRoot: '/tmp/unused',
      loadedFiles: [],
      evidencePool: {
        records: [],
        preRankingPoolTruncated: false,
        safeSelectionCollision: false,
      },
      eligiblePool: { records: [] },
      gitState: 'unknown',
      signal: new AbortController().signal,
    });
    const proof = registered.proof;

    expect(() =>
      createSnapshotOutcomeContributionV2({
        snapshotProof: createOpaqueTokenV2<SnapshotTrustProofV2>(),
        execution,
        discardedEvidenceCount: 2,
        ledger: [],
      }),
    ).toThrow(/registered final-check proof/i);

    const token = createSnapshotOutcomeContributionV2({
      snapshotProof: proof,
      execution,
      discardedEvidenceCount: 2,
      ledger: [
        Object.freeze({
          selected: true,
          scopeIncluded: true,
          maxFileBytesReached: true,
          maxExcerptBytesReached: false,
          negativeExcluded: true,
          duplicateExtraCount: 3,
          unverifiedOrdinary: true,
        }),
        Object.freeze({
          selected: true,
          scopeIncluded: false,
          maxFileBytesReached: true,
          maxExcerptBytesReached: true,
          negativeExcluded: true,
          duplicateExtraCount: 9,
          unverifiedOrdinary: true,
        }),
      ],
    });
    const contribution = requireSnapshotOutcomeContributionV2(
      token,
      proof,
      execution,
    );
    expect(contribution.owner).toBe('snapshot-observation');
    expect(contribution.readLimits.maxFileBytesReached).toBe(true);
    expect(contribution.readLimits.maxExcerptBytesReached).toBe(false);
    expect(contribution.exclusions.negativeTermMatchCount).toBe(1);
    expect(contribution.exclusions.duplicateLocationCount).toBe(3);
    expect(contribution.exclusions.unverifiedFileContentCount).toBe(1);
    expect(contribution.exclusions.snapshotChangedCount).toBe(2);

    expect(() =>
      requireSnapshotOutcomeContributionV2(
        token,
        createOpaqueTokenV2<SnapshotTrustProofV2>(),
        execution,
      ),
    ).toThrow(/trust mismatch/i);
  });
});
