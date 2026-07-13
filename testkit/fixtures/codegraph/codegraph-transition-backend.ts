import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  RepositorySearchBackend,
  SearchBackendId,
} from '../../../src/contracts/index.js';

export class CodeGraphTransitionBackend implements RepositorySearchBackend {
  public calls = 0;

  public constructor(
    public readonly id: SearchBackendId,
    private readonly result: BackendSearchResult,
    private readonly onSearch?: () => void,
  ) {}

  public async probe(
    _repositoryRoot: string,
    _signal: AbortSignal,
  ): Promise<BackendHealth> {
    return this.result.health;
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    this.calls += 1;
    this.onSearch?.();
    return this.result;
  }
}
