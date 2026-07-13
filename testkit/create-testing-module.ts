import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app/app.module.js';
import type {
  RepositoryEvidenceService,
  RepositoryReader,
  RepositorySearchBackend,
} from '../src/contracts/index.js';
import {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../src/runtime/tokens.js';

export interface RepoNavTestingOverrides {
  readonly backends: readonly RepositorySearchBackend[];
  readonly reader: RepositoryReader;
  readonly service: RepositoryEvidenceService;
}

export async function createRepoNavTestingModule(
  overrides: RepoNavTestingOverrides,
): Promise<TestingModule> {
  return await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(REPOSITORY_SEARCH_BACKENDS)
    .useValue(Object.freeze([...overrides.backends]))
    .overrideProvider(REPOSITORY_READER)
    .useValue(overrides.reader)
    .overrideProvider(REPOSITORY_EVIDENCE_SERVICE)
    .useValue(overrides.service)
    .compile();
}
