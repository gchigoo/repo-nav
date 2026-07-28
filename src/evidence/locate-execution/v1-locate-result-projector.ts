/**
 * Production v1 locate result projector. Returns exact legacyV1Projection reference.
 * F9 deletes this adapter after projector-edge cutover.
 */

import { Injectable } from '@nestjs/common';

import type {
  CanonicalLocateExecutionV2,
  LocateProjectionExecutionCapabilityV2,
  LocateResultProjector,
  LegacyV1LocateFailure,
  LegacyV1LocateSuccess,
} from '../../contracts/v2/locate-fact-envelope-v2.js';
import { requireCanonicalLocateExecutionTokenV2 } from './locate-projection-execution-capability-v2.js';

@Injectable()
export class V1LocateResultProjector
  implements LocateResultProjector<LegacyV1LocateSuccess | LegacyV1LocateFailure>
{
  /**
   * Return the same-run legacy v1 object after recovering the issuer-bound token.
   */
  public project(
    input: CanonicalLocateExecutionV2,
    execution: LocateProjectionExecutionCapabilityV2,
  ): LegacyV1LocateSuccess | LegacyV1LocateFailure {
    requireCanonicalLocateExecutionTokenV2(input, execution);
    return input.legacyV1Projection;
  }
}
