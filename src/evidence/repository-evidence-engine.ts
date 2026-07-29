/**
 * Thin RepositoryEvidenceService façade over PublicLocateExecutionApplicationV2.
 * Concrete class is not exported from the package barrel after F1C.
 */

import { Inject, Injectable } from '@nestjs/common';

import type {
  LocateExecutionContext,
  LocateRequest,
  RepositoryEvidenceService,
} from '../contracts/index.js';
import type { LocateResultV2 } from '../contracts/v2/locate-result-v2.js';
import {
  PUBLIC_LOCATE_EXECUTION_APPLICATION_V2,
  type PublicLocateExecutionApplicationV2,
} from './locate-execution/public-locate-execution-application-v2.js';

@Injectable()
export class RepositoryEvidenceEngine implements RepositoryEvidenceService {
  public constructor(
    @Inject(PUBLIC_LOCATE_EXECUTION_APPLICATION_V2)
    private readonly application: PublicLocateExecutionApplicationV2,
  ) {}

  public async locate(
    request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<LocateResultV2> {
    const view = await this.application.execute(request, context);
    return view.value;
  }
}
