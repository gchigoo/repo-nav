import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import type {
  BackendExecutionContextV2,
  TrustedBackendDiscoveryHandoffV2,
} from '../../src/contracts/v2/backend-execution-outcome-v2.js';
import type { MultiViewBackendSearchRequestV2 } from '../../src/evidence/request-snapshot/discovery-reservation-v2.js';
import {
  assertSameSearchViewsAbiV2,
  type F3SearchViewsConsumerV2,
  type F5SearchViewsProviderV2,
} from '../../testkit/fixtures/backend-execution-v2/f3-f5-handoff-v2.js';

type SearchViewsAbi = (
  request: MultiViewBackendSearchRequestV2,
  signal: AbortSignal,
  backendExecutionContext: BackendExecutionContextV2,
  execution: LocateExecutionTokenV2,
) => Promise<TrustedBackendDiscoveryHandoffV2>;

const provider: SearchViewsAbi = async () => {
  throw new Error('compile-only');
};
const consumer: SearchViewsAbi = provider;

assertSameSearchViewsAbiV2(
  provider as unknown as F5SearchViewsProviderV2,
  consumer as unknown as F3SearchViewsConsumerV2,
);

export {};
