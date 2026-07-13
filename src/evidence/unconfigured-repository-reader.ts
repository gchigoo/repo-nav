import { Injectable } from '@nestjs/common';

import type {
  EvidenceLocation,
  NormalizedSearchTerm,
  RepositoryReader,
  RepositoryReadLimits,
} from '../contracts/index.js';
import { RepoNavBootstrapIncompleteError } from '../runtime/repo-nav-bootstrap-incomplete.error.js';

@Injectable()
export class UnconfiguredRepositoryReader implements RepositoryReader {
  public async resolveRoot(
    _repoPath: string,
    _signal: AbortSignal,
  ): Promise<string> {
    throw new RepoNavBootstrapIncompleteError('RepositoryReader');
  }

  public async readRange(
    _repositoryRoot: string,
    _relativeFile: string,
    _lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    throw new RepoNavBootstrapIncompleteError('RepositoryReader');
  }

  public async findMatches(
    _repositoryRoot: string,
    _relativeFile: string,
    _terms: readonly NormalizedSearchTerm[],
    _symbol: string | undefined,
    _maxMatches: number,
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]> {
    throw new RepoNavBootstrapIncompleteError('RepositoryReader');
  }
}
