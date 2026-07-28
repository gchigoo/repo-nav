import { describe, expect, it, vi } from 'vitest';

import type {
  BackendHealth,
  BackendSearchRequest,
  BackendSearchResult,
  LocateRequest,
  RepositoryReader,
  RepositorySearchBackend,
} from '../../src/contracts/index.js';
import { CanonicalRepositoryLocateExecutorV2 } from '../../src/evidence/locate-execution/canonical-locate-executor-v2.js';
import {
  issueLocateProjectionExecutionCapabilityV2,
  requireCanonicalLocateExecutionTokenV2,
  requireLocateProjectionExecutionTokenV2,
} from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { V1LocateResultProjector } from '../../src/evidence/locate-execution/v1-locate-result-projector.js';
import { createV2ShadowLocateProjectorV2 } from '../../src/evidence/canonical/v2-shadow-locate-projector.js';
import { createSyntheticLocateProjectionPreparationPortV2 } from '../../testkit/testing/create-synthetic-locate-projection-preparation-port-v2.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

const singleSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-single-execution',
});
const termSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-term-case-parity',
});
const paritySelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-v1-projector-parity',
});
const isolationSelected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-v1-shadow-isolation',
});

class CountingBackend implements RepositorySearchBackend {
  public readonly id = 'ripgrep' as const;
  public searchCount = 0;

  public async probe(): Promise<BackendHealth> {
    return { state: 'available' };
  }

  public async search(
    _request: BackendSearchRequest,
  ): Promise<BackendSearchResult> {
    this.searchCount += 1;
    return { health: { state: 'available' }, hits: [], complete: true };
  }
}

class CountingReader implements RepositoryReader {
  public resolveCount = 0;

  public async resolveRoot(repoPath: string): Promise<string> {
    this.resolveCount += 1;
    return repoPath;
  }

  public async readRange(): Promise<never> {
    throw new Error('readRange unexpected');
  }

  public async readWindow(): Promise<never> {
    throw new Error('readWindow unexpected');
  }

  public async findMatches(): Promise<readonly never[]> {
    return [];
  }
}

const baseRequest: LocateRequest = {
  repoPath: '/tmp/repo-nav-fixture',
  question: 'Where is mapping?',
  terms: ['Mapping', 'mapping'],
  termCase: 'insensitive',
};

describe.runIf(singleSelected)('F1C-SINGLE-EXEC-001 single execution', () => {
  it('executes backend/reader once and binds input/capability/token', async () => {
    const backend = new CountingBackend();
    const reader = new CountingReader();
    const executor = new CanonicalRepositoryLocateExecutorV2([backend], reader);
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const token = requireLocateProjectionExecutionTokenV2(capability);
    const input = await executor.execute(baseRequest, {
      signal: new AbortController().signal,
    }, capability);
    expect(backend.searchCount).toBe(1);
    expect(reader.resolveCount).toBe(1);
    expect(requireCanonicalLocateExecutionTokenV2(input, capability)).toBe(
      token,
    );
    expect(() =>
      requireCanonicalLocateExecutionTokenV2(
        { ...input },
        capability,
      ),
    ).toThrow();
    expect(() =>
      requireCanonicalLocateExecutionTokenV2(
        input,
        issueLocateProjectionExecutionCapabilityV2(),
      ),
    ).toThrow();
  });
});

describe.runIf(termSelected)('F1C-TERM-CASE-001 term case parity', () => {
  it('normalizes positive terms once into shared envelope/legacy arrays', async () => {
    const backend = new CountingBackend();
    const seen: BackendSearchRequest[] = [];
    backend.search = async (request) => {
      seen.push(request);
      backend.searchCount += 1;
      return { health: { state: 'available' }, hits: [], complete: true };
    };
    const executor = new CanonicalRepositoryLocateExecutorV2(
      [backend],
      new CountingReader(),
    );
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const input = await executor.execute(
      {
        ...baseRequest,
        terms: ['Cafe\u0301', 'café'],
        termCase: 'insensitive',
        negativeTerms: ['Skip'],
        anchors: [{ kind: 'term', value: 'Anchor' }],
      },
      { signal: new AbortController().signal },
      capability,
    );
    expect(input.ok).toBe(true);
    if (!input.ok) throw new Error('expected success');
    expect(input.envelope.normalizedTerms).toBe(
      input.legacyV1Projection.evidence.normalizedTerms,
    );
    expect(seen[0]?.terms).toBe(input.envelope.normalizedTerms);
  });
});

describe.runIf(paritySelected)('F1C-V1-PARITY-001 v1 projector parity', () => {
  it('returns the exact legacy object reference without normalize', async () => {
    const harness = createCanonicalLocateEngineHarnessV2(
      [new CountingBackend()],
      new CountingReader(),
    );
    const capability = issueLocateProjectionExecutionCapabilityV2();
    const input = await harness.executor.execute(
      baseRequest,
      { signal: new AbortController().signal },
      capability,
    );
    const projected = harness.projector.project(input, capability);
    expect(projected).toBe(input.legacyV1Projection);
  });
});

describe.runIf(isolationSelected)(
  'F1C-V1-SHADOW-ISOLATION-001 v1/shadow isolation',
  () => {
    it('keeps v1 exact reference when shadow fails and does not re-execute', async () => {
      const backend = new CountingBackend();
      const reader = new CountingReader();
      const executor = new CanonicalRepositoryLocateExecutorV2(
        [backend],
        reader,
      );
      const projector = new V1LocateResultProjector();
      const capability = issueLocateProjectionExecutionCapabilityV2();
      const input = await executor.execute(
        baseRequest,
        { signal: new AbortController().signal },
        capability,
      );
      expect(backend.searchCount).toBe(1);
      const v1 = projector.project(input, capability);
      const shadow = createV2ShadowLocateProjectorV2().project(
        input,
        capability,
        createSyntheticLocateProjectionPreparationPortV2(),
      );
      expect(shadow.ok).toBe(false);
      expect(projector.project(input, capability)).toBe(v1);
      expect(backend.searchCount).toBe(1);
      expect(reader.resolveCount).toBe(1);
      expect(vi.isFakeTimers()).toBe(false);
    });
  },
);
