/**
 * Thin RepositoryEvidenceService façade over canonical executor + v1 projector.
 * Concrete class is not exported from the package barrel after F1C.
 */

import { Inject, Injectable } from '@nestjs/common';

import type {
  LocateExecutionContext,
  LocateRequest,
  LocateResult,
  RepositoryEvidenceService,
} from '../contracts/index.js';
import type {
  CanonicalLocateExecutorV2,
  LocateResultProjector,
  LegacyV1LocateFailure,
  LegacyV1LocateSuccess,
} from '../contracts/v2/locate-fact-envelope-v2.js';
import {
  CANONICAL_LOCATE_EXECUTOR_V2,
  LOCATE_RESULT_PROJECTOR,
} from './locate-execution/locate-execution.tokens.js';
import { issueLocateProjectionExecutionCapabilityV2 } from './locate-execution/locate-projection-execution-capability-v2.js';

@Injectable()
export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
  public constructor(
    @Inject(CANONICAL_LOCATE_EXECUTOR_V2)
    private readonly executor: CanonicalLocateExecutorV2,
    @Inject(LOCATE_RESULT_PROJECTOR)
    private readonly projector: LocateResultProjector<
      LegacyV1LocateSuccess | LegacyV1LocateFailure
    >,
  ) {}

  public async locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResult> {
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const input = await this.executor.execute(request, context, capability);
    return this.projector.project(input, capability);
  }
}
