import type { SnapshotFactsV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import type { RepositoryGitStateV2 } from './repository-git-state-probe-v2.js';

/**
 * 零读取 success：可信 unknown empty snapshot（非 placeholder）。
 */
export function createZeroReadSnapshotFactsV2(
  gitState: RepositoryGitStateV2 = 'unknown',
): SnapshotFactsV2 {
  return Object.freeze({
    coverage: Object.freeze({
      gitState,
      consistency: 'unknown' as const,
      filesChecked: 0,
      discardedEvidenceCount: 0,
    }),
    finalStableEvidence: Object.freeze([]),
  });
}
