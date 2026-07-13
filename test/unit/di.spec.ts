import { describe, expect, it } from 'vitest';

import { createRepoNavApplicationContext } from '../../src/app/create-application-context.js';
import {
  LocateRequestSchema,
  type BackendHealth,
  type BackendSearchRequest,
  type BackendSearchResult,
  type LocateExecutionContext,
  type LocateRequest,
  type LocateResult,
  type RepositoryEvidenceService,
  type RepositoryReader,
  type RepositoryReadLimits,
  type RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { RepoNavBootstrapIncompleteError } from '../../src/runtime/repo-nav-bootstrap-incomplete.error.js';
import {
  MCP_STDIO_HOST,
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_READER,
  REPOSITORY_SEARCH_BACKENDS,
} from '../../src/runtime/tokens.js';
import { createRepoNavTestingModule } from '../../testkit/create-testing-module.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = { group: 'di', caseId: 'di-assembly' } as const;
const request = LocateRequestSchema.parse({
  repoPath: 'C:/fixture',
  question: 'Where is hcp_id mapped?',
  terms: ['hcp_id'],
});

class FakeBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;

  public async probe(
    _repositoryRoot: string,
    _signal: AbortSignal,
  ): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
    _signal: AbortSignal,
  ): Promise<BackendSearchResult> {
    return { health: { state: 'available' }, hits: [], complete: true };
  }
}

class FakeReader implements RepositoryReader {
  public async resolveRoot(
    repoPath: string,
    _signal: AbortSignal,
  ): Promise<string> {
    return repoPath;
  }

  public readRange(
    _repositoryRoot: string,
    _relativeFile: string,
    _lines: readonly [number, number],
    _limits: RepositoryReadLimits,
    _signal: AbortSignal,
  ): Promise<never> {
    throw new Error('Fixture readRange was not expected.');
  }

  public async findMatches(): Promise<readonly never[]> {
    return [];
  }
}

class FakeService implements RepositoryEvidenceService {
  public async locate(
    _request: LocateRequest,
    _context: LocateExecutionContext,
  ): Promise<LocateResult> {
    return {
      ok: false,
      error: {
        code: 'INVALID_REPOSITORY',
        message: 'Synthetic fixture repository.',
        recoverable: false,
      },
    };
  }
}

describe.runIf(isSelected(identity))('NestJS standalone DI assembly', () => {
  it('creates and closes a non-HTTP context with fail-closed defaults', async () => {
    const application = await createRepoNavApplicationContext();
    try {
      const backends = application.get<readonly RepositorySearchBackend[]>(
        REPOSITORY_SEARCH_BACKENDS,
      );
      const reader = application.get<RepositoryReader>(REPOSITORY_READER);
      const service = application.get<RepositoryEvidenceService>(
        REPOSITORY_EVIDENCE_SERVICE,
      );

      expect(backends).toEqual([]);
      expect(Object.isFrozen(backends)).toBe(true);
      await expect(
        reader.resolveRoot(request.repoPath, new AbortController().signal),
      ).rejects.toBeInstanceOf(RepoNavBootstrapIncompleteError);
      await expect(
        service.locate(request, { signal: new AbortController().signal }),
      ).rejects.toBeInstanceOf(RepoNavBootstrapIncompleteError);
      expect(() => application.get(MCP_STDIO_HOST)).toThrow();
    } finally {
      await application.close();
    }
  });

  it('replaces every external seam through overrideProvider', async () => {
    const backend = new FakeBackend();
    const reader = new FakeReader();
    const service = new FakeService();
    const testingModule = await createRepoNavTestingModule({
      backends: [backend],
      reader,
      service,
    });

    expect(
      testingModule.get<readonly RepositorySearchBackend[]>(
        REPOSITORY_SEARCH_BACKENDS,
      ),
    ).toEqual([backend]);
    expect(testingModule.get(REPOSITORY_READER)).toBe(reader);
    expect(testingModule.get(REPOSITORY_EVIDENCE_SERVICE)).toBe(service);

    await expect(testingModule.close()).resolves.toBeUndefined();
  });
});
