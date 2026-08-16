/**
 * Unique internal locate request seam: capability → validate → execute/project → transport value.
 */

import { Inject, Injectable } from '@nestjs/common';

import type { LocateExecutionContext } from '../../contracts/index.js';
import { safeParseLocateRequestV2 } from '../../contracts/locate-request-parse-v2.js';
import type {
  CanonicalLocateExecutorV2,
  LocateResultProjectorV2,
  SerializedLocateResultV2,
} from '../../contracts/v2/canonical-locate-execution-v2.js';
import {
  CANONICAL_LOCATE_EXECUTOR_V2,
  LOCATE_RESULT_PROJECTOR,
} from './locate-execution.tokens.js';
import { finalizeLocateResultV2 } from './finalize-locate-result-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from './locate-projection-execution-capability-v2.js';

export const PUBLIC_LOCATE_EXECUTION_APPLICATION_V2 = Symbol(
  'PUBLIC_LOCATE_EXECUTION_APPLICATION_V2',
);

export interface PublicLocateExecutionApplicationV2 {
  execute(
    rawRequest: unknown,
    context: LocateExecutionContext,
  ): Promise<SerializedLocateResultV2>;
}

function suggestsAddTerm(rawRequest: unknown): boolean {
  if (typeof rawRequest !== 'object' || rawRequest === null) {
    return false;
  }
  const terms = Reflect.get(rawRequest, 'terms');
  return terms === undefined || (Array.isArray(terms) && terms.length === 0);
}

@Injectable()
export class PublicLocateExecutionApplicationServiceV2 implements PublicLocateExecutionApplicationV2 {
  public constructor(
    @Inject(CANONICAL_LOCATE_EXECUTOR_V2)
    private readonly executor: CanonicalLocateExecutorV2,
    @Inject(LOCATE_RESULT_PROJECTOR)
    private readonly projector: LocateResultProjectorV2,
  ) {}

  public async execute(
    rawRequest: unknown,
    context: LocateExecutionContext,
  ): Promise<SerializedLocateResultV2> {
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const parsed = safeParseLocateRequestV2(rawRequest);
    if (!parsed.success) {
      return finalizeLocateResultV2({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          ...(suggestsAddTerm(rawRequest)
            ? { suggestedAction: 'ADD_TERM' as const }
            : {}),
        },
      });
    }

    const input = await this.executor.execute(parsed.data, context, capability);
    return this.projector.project(input, capability);
  }
}
