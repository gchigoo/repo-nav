import { Module } from '@nestjs/common';

import type { RepositorySearchBackend } from '../contracts/index.js';
import { REPOSITORY_SEARCH_BACKENDS } from '../runtime/tokens.js';
import { NodeSafeProcessRunner } from './node-safe-process-runner.js';

export const EMPTY_REPOSITORY_SEARCH_BACKENDS: readonly RepositorySearchBackend[] =
  Object.freeze([]);

@Module({
  providers: [
    NodeSafeProcessRunner,
    {
      provide: REPOSITORY_SEARCH_BACKENDS,
      useValue: EMPTY_REPOSITORY_SEARCH_BACKENDS,
    },
  ],
  exports: [REPOSITORY_SEARCH_BACKENDS, NodeSafeProcessRunner],
})
export class RepositoryBackendsModule {}
