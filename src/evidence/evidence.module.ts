import { Module } from '@nestjs/common';

import { NodeRepositoryReader } from '../repository/node-repository-reader.js';
import { RepositoryBackendsModule } from '../repository/repository-backends.module.js';
import {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
} from '../runtime/tokens.js';
import {
  CANONICAL_LOCATE_EXECUTOR_V2,
  LOCATE_RESULT_PROJECTOR,
} from './locate-execution/locate-execution.tokens.js';
import { CanonicalRepositoryLocateExecutorV2 } from './locate-execution/canonical-locate-executor-v2.js';
import { V1LocateResultProjector } from './locate-execution/v1-locate-result-projector.js';
import { RepositoryEvidenceEngine } from './repository-evidence-engine.js';

@Module({
  imports: [RepositoryBackendsModule],
  providers: [
    NodeRepositoryReader,
    {
      provide: REPOSITORY_READER,
      useExisting: NodeRepositoryReader,
    },
    CanonicalRepositoryLocateExecutorV2,
    {
      provide: CANONICAL_LOCATE_EXECUTOR_V2,
      useExisting: CanonicalRepositoryLocateExecutorV2,
    },
    V1LocateResultProjector,
    {
      provide: LOCATE_RESULT_PROJECTOR,
      useExisting: V1LocateResultProjector,
    },
    RepositoryEvidenceEngine,
    {
      provide: REPOSITORY_EVIDENCE_SERVICE,
      useExisting: RepositoryEvidenceEngine,
    },
  ],
  exports: [REPOSITORY_EVIDENCE_SERVICE, REPOSITORY_READER],
})
export class EvidenceModule {}
