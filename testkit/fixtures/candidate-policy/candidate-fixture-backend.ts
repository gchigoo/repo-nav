import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  RepositorySearchBackend,
} from '../../../src/contracts/index.js';

export const candidateFixtureRoot = resolve(import.meta.dirname);
const candidateFile = 'server/mapping.fixture';
const candidateExcerpt = readFileSync(
  resolve(candidateFixtureRoot, candidateFile),
  'utf8',
).trimEnd();
const candidateLines = candidateExcerpt.split('\n');
const candidateLineIndex = candidateLines.findIndex((line) =>
  line.includes('hcpId: row.hcp_id'),
);
const candidateLine = candidateLines[candidateLineIndex];
if (candidateLineIndex < 0 || candidateLine === undefined) {
  throw new Error('Candidate fixture mapping seed is missing.');
}

export class CandidateFixtureBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public async probe(
    _repositoryRoot: string,
    _signal: AbortSignal,
  ): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return {
      health: { state: 'available' },
      hits: [
        {
          file: candidateFile,
          lines: [candidateLineIndex + 1, candidateLineIndex + 1],
          matchedText: candidateLine,
          source: 'ripgrep',
          reasonCodes: ['LITERAL_TERM_HIT'],
        },
      ],
      complete: true,
    };
  }
}
