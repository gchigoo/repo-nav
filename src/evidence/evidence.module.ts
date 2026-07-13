import { Module } from '@nestjs/common';

import { RepositoryBackendsModule } from '../repository/repository-backends.module.js';
import {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
} from '../runtime/tokens.js';
import { UnconfiguredRepositoryEvidenceService } from './unconfigured-repository-evidence.service.js';
import { UnconfiguredRepositoryReader } from './unconfigured-repository-reader.js';

@Module({
  imports: [RepositoryBackendsModule],
  providers: [
    UnconfiguredRepositoryReader,
    {
      provide: REPOSITORY_READER,
      useExisting: UnconfiguredRepositoryReader,
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
