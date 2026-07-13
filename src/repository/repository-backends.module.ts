import { Module } from '@nestjs/common';

import type { RepositorySearchBackend } from '../contracts/index.js';
import { REPOSITORY_SEARCH_BACKENDS } from '../runtime/tokens.js';
import { NodeSafeProcessRunner } from './node-safe-process-runner.js';
import { RipgrepBackend } from './ripgrep-backend.js';

@Module({
  providers: [
    NodeSafeProcessRunner,
    RipgrepBackend,
    {
      provide: REPOSITORY_SEARCH_BACKENDS,
      inject: [RipgrepBackend],
      useFactory: (
        ripgrep: RipgrepBackend,
      ): readonly RepositorySearchBackend[] => Object.freeze([ripgrep]),
    },
  ],
  exports: [REPOSITORY_SEARCH_BACKENDS, NodeSafeProcessRunner, RipgrepBackend],
})
export class RepositoryBackendsModule {}
