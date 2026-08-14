import type { RepositorySearchBackend } from '../index.js';
import type { MultiViewBackendSearchRequestV2 } from '../../evidence/request-snapshot/discovery-reservation-v2.js';
import type {
  BackendExecutionContextV2,
  TrustedBackendDiscoveryHandoffV2,
} from './backend-execution-outcome-v2.js';
import type { LocateExecutionTokenV2 } from './locate-fact-envelope-v2.js';

export interface TraceableRepositorySearchBackendV2 extends Pick<
  RepositorySearchBackend,
  'id' | 'probe'
> {
  searchViews(
    request: MultiViewBackendSearchRequestV2,
    signal: AbortSignal,
    context: BackendExecutionContextV2,
    execution: LocateExecutionTokenV2,
  ): Promise<TrustedBackendDiscoveryHandoffV2>;
}
