import { Injectable } from '@nestjs/common';

import type {
  CanonicalLocateExecutionReceiptV2,
  LocateProjectionExecutionCapabilityV2,
  LocateResultProjectorV2,
  SerializedLocateResultV2,
} from '../../contracts/v2/canonical-locate-execution-v2.js';
import { finalizeLocateResultV2 } from './finalize-locate-result-v2.js';
import { requireCanonicalLocateExecutionInputV2 } from './locate-projection-execution-capability-v2.js';

@Injectable()
export class V2LocateResultProjector implements LocateResultProjectorV2 {
  public project(
    receipt: CanonicalLocateExecutionReceiptV2,
    execution: LocateProjectionExecutionCapabilityV2,
  ): SerializedLocateResultV2 {
    try {
      const input = requireCanonicalLocateExecutionInputV2(receipt, execution);
      return finalizeLocateResultV2(input);
    } catch {
      return finalizeLocateResultV2({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      });
    }
  }
}
