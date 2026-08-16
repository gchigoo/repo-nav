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
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  PublicLocateExecutionApplicationServiceV2,
} from './locate-execution/public-locate-execution-application-v2.js';
import { V2LocateResultProjector } from './locate-execution/v2-locate-result-projector.js';
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
    V2LocateResultProjector,
    {
      provide: LOCATE_RESULT_PROJECTOR,
      useExisting: V2LocateResultProjector,
    },
    PublicLocateExecutionApplicationServiceV2,
    {
      provide: PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
      useExisting: PublicLocateExecutionApplicationServiceV2,
    },
    RepositoryEvidenceEngine,
    {
      provide: REPOSITORY_EVIDENCE_SERVICE,
      useExisting: RepositoryEvidenceEngine,
    },
  ],
  exports: [
    REPOSITORY_EVIDENCE_SERVICE,
    REPOSITORY_READER,
    PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  ],
})
export class EvidenceModule {}
