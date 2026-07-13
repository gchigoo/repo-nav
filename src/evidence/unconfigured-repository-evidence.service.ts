import { Inject, Injectable } from '@nestjs/common';

import type {
  LocateExecutionContext,
  LocateRequest,
  LocateResult,
  RepositoryEvidenceService,
  RepositoryReader,
  RepositorySearchBackend,
} from '../contracts/index.js';
import { RepoNavBootstrapIncompleteError } from '../runtime/repo-nav-bootstrap-incomplete.error.js';
import {
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../runtime/tokens.js';

@Injectable()
export class UnconfiguredRepositoryEvidenceService
  implements RepositoryEvidenceService
{
  public constructor(
    @Inject(REPOSITORY_SEARCH_BACKENDS)
    _backends: readonly RepositorySearchBackend[],
    @Inject(REPOSITORY_READER)
    _reader: RepositoryReader,
  ) {}

  public async locate(
    _request: LocateRequest,
    _context: LocateExecutionContext,
  ): Promise<LocateResult> {
    throw new RepoNavBootstrapIncompleteError('RepositoryEvidenceService');
  }
}
