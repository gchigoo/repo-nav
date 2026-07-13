import { Module } from '@nestjs/common';

import type { RepositorySearchBackend } from '../contracts/index.js';
import { REPOSITORY_SEARCH_BACKENDS } from '../runtime/tokens.js';
import { NodeSafeProcessRunner } from './node-safe-process-runner.js';
import { CodeGraphBackend } from './codegraph-backend.js';
import { RipgrepBackend } from './ripgrep-backend.js';

@Module({
  providers: [
    NodeSafeProcessRunner,
    CodeGraphBackend,
    RipgrepBackend,
    {
      provide: REPOSITORY_SEARCH_BACKENDS,
      inject: [CodeGraphBackend, RipgrepBackend],
      useFactory: (
        codegraph: CodeGraphBackend,
        ripgrep: RipgrepBackend,
      ): readonly RepositorySearchBackend[] =>
        Object.freeze([codegraph, ripgrep]),
    },
  ],
  exports: [
    REPOSITORY_SEARCH_BACKENDS,
    NodeSafeProcessRunner,
    CodeGraphBackend,
    RipgrepBackend,
  ],
})
export class RepositoryBackendsModule {}
