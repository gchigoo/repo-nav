import { describe, expect, it } from 'vitest';

import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import {
  CANONICAL_V1_BRIDGE_GOLDEN_CASE_ID,
  CANONICAL_V1_BRIDGE_SCHEMA_VERSION,
} from '../../testkit/fixtures/canonical-locate-bridge-v2/v1-bridge-golden-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';
import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  RepositoryReader,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';

const selected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: CANONICAL_V1_BRIDGE_GOLDEN_CASE_ID,
});

class EmptyBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;
  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }
  public async search(
    _request: BackendSearchRequest,
  ): Promise<BackendSearchResult> {
    return { health: { state: 'available' }, hits: [], complete: true };
  }
}

class PassthroughReader implements RepositoryReader {
  public async resolveRoot(repoPath: string): Promise<string> {
    return repoPath;
  }
  public async readRange(): Promise<never> {
    throw new Error('unexpected');
  }
  public async readWindow(): Promise<never> {
    throw new Error('unexpected');
  }
  public async findMatches(): Promise<readonly never[]> {
    return [];
  }
}

describe.runIf(selected)('F1C-V1-GOLDEN-001 canonical v1 bridge parity', () => {
  it('keeps production v1 schemaVersion 1.0 through the façade', async () => {
    const harness = createCanonicalLocateEngineHarnessV2(
      [new EmptyBackend()],
      new PassthroughReader(),
    );
    const result = await harness.service.locate(
      {
        repoPath: '/tmp/repo-nav-fixture',
        question: 'Where is mapping?',
        terms: ['mapping'],
      },
      { signal: new AbortController().signal },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.evidence.schemaVersion).toBe(
      CANONICAL_V1_BRIDGE_SCHEMA_VERSION,
    );
    expect(result.evidence.schemaVersion).toBe('1.0');
  });
});
