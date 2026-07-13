import { Module } from '@nestjs/common';

import { NodeRepositoryReader } from '../repository/node-repository-reader.js';
import { RepositoryBackendsModule } from '../repository/repository-backends.module.js';
import {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
} from '../runtime/tokens.js';
import { UnconfiguredRepositoryEvidenceService } from './unconfigured-repository-evidence.service.js';

@Module({
  imports: [RepositoryBackendsModule],
  providers: [
    NodeRepositoryReader,
    {
      provide: REPOSITORY_READER,
      useExisting: NodeRepositoryReader,
    },
    UnconfiguredRepositoryEvidenceService,
    {
      provide: REPOSITORY_EVIDENCE_SERVICE,
      useExisting: UnconfiguredRepositoryEvidenceService,
    },
  ],
  exports: [REPOSITORY_EVIDENCE_SERVICE, REPOSITORY_READER],
})
export class EvidenceModule {}
