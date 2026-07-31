/**
 * Unique internal locate request seam: capability → validate → execute/project → transport view.
 */

import { Inject, Injectable } from '@nestjs/common';

import type { LocateExecutionContext } from '../../contracts/index.js';
import { safeParseLocateRequestV2 } from '../../contracts/locate-request-parse-v2.js';
import type {
  CanonicalLocateExecutorV2,
  LocateResultProjector,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import { createTrustedSerializedPublicToolErrorV2 } from '../canonical/trusted-serialized-locate-result-v2.js';
import {
  CANONICAL_LOCATE_EXECUTOR_V2,
  LOCATE_RESULT_PROJECTOR,
} from './locate-execution.tokens.js';
import { issueLocateProjectionExecutionCapabilityV2 } from './locate-projection-execution-capability-v2.js';
import {
  promoteTrustedSerializedPublicToolErrorV2,
  requirePublicLocateTransportValueV2,
  type PublicLocateTransportViewV2,
  type TrustedPublicLocateTransportBundleV2,
} from './public-locate-transport-registry-v2.js';

export const PUBLIC_LOCATE_EXECUTION_APPLICATION_V2 = Symbol(
  'PUBLIC_LOCATE_EXECUTION_APPLICATION_V2',
);

export interface PublicLocateExecutionApplicationV2 {
  execute(
    rawRequest: unknown,
    context: LocateExecutionContext,
  ): Promise<PublicLocateTransportViewV2>;
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
    private readonly projector: LocateResultProjector<TrustedPublicLocateTransportBundleV2>,
  ) {}

  /**
   * Issue capability before validation; project via unique v2 projector; expose transport view.
   */
  public async execute(
    rawRequest: unknown,
    context: LocateExecutionContext,
  ): Promise<PublicLocateTransportViewV2> {
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const parsed = safeParseLocateRequestV2(rawRequest);
    if (!parsed.success) {
      const serialized = createTrustedSerializedPublicToolErrorV2(
        'INVALID_INPUT',
        suggestsAddTerm(rawRequest) ? 'ADD_TERM' : undefined,
        capability,
      );
      const bundle = promoteTrustedSerializedPublicToolErrorV2(
        serialized,
        capability,
      );
      return requirePublicLocateTransportValueV2(
        bundle.value,
        bundle.receipt,
        capability,
      );
    }

    const input = await this.executor.execute(parsed.data, context, capability);
    const bundle = this.projector.project(input, capability);
    return requirePublicLocateTransportValueV2(
      bundle.value,
      bundle.receipt,
      capability,
    );
  }
}
