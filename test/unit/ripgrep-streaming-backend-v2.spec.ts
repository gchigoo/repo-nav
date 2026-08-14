import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
  StreamingSafeProcessRunnerV2,
} from '../../src/contracts/safe-process.js';
import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import {
  createBackendExecutionContextV2,
  requireBackendDiscoveryHandoffForF3V2,
  requireBackendExecutionOutcomeV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { MULTI_VIEW_CAP_CASES_V2 } from '../../testkit/fixtures/ripgrep/multi-view-runner-v2.js';
import { ARRIVAL_SORT_REVERSAL_V2 } from '../../testkit/fixtures/ripgrep/multi-view-cap-order-v2.js';
import { NO_START_NO_CHILD_PATHS_V2 } from '../../testkit/fixtures/process-v2/no-start-no-child-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken(): LocateExecutionTokenV2 {
  return createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
}

class CountingRunnerV2 implements StreamingSafeProcessRunnerV2 {
  public runCount = 0;
  public streamCount = 0;
  public constructor(private readonly inner: NodeSafeProcessRunner) {}
  public run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    this.runCount += 1;
    return this.inner.run(request, signal);
  }
  public runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    this.streamCount += 1;
    return this.inner.runStreaming(request, signal, consumer);
  }
}

describe.runIf(
  isSelected({ group: 'streaming-ripgrep', caseId: 'max-hits-groups' }),
)('F5-HITS-001 max hits', () => {
  it('caps expanded via production searchViews streaming path', async () => {
    expect(MULTI_VIEW_CAP_CASES_V2.length).toBe(3);
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-hits-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      writeFileSync(resolve(repository, 'b.ts'), 'const Foo = 2;\n', 'utf8');
      writeFileSync(resolve(repository, 'c.ts'), 'const Foo = 3;\n', 'utf8');
      const counting = new CountingRunnerV2(new NodeSafeProcessRunner());
      const signal = new AbortController().signal;
      const execution = executionToken();
      const context = createBackendExecutionContextV2(
        counting,
        undefined,
        signal,
        execution,
      );
      const request = {
        base: {
          repositoryRoot: repository,
          terms: [{ value: 'Foo', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        expandedMaxHits: 2,
        legacyMaxHits: 10,
      };
      const handoff = await new RipgrepBackend(
        new NodeSafeProcessRunner(),
      ).searchViews(request, signal, context, execution);
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'ripgrep',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      const outcome = requireBackendExecutionOutcomeV2(
        view.expandedOutcome,
        execution,
      );
      expect(outcome.hitCount).toBe(2);
      expect(outcome.selectionEligibility).toBe('telemetry-only');
      expect(outcome.termination).toBe('early-stop');
      expect(counting.streamCount).toBeGreaterThanOrEqual(1);
      expect(view.completeSafeHits).toHaveLength(0);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'multi-view-cap-and-order',
  }),
)('F5-MULTIVIEW-001 cap and order', () => {
  it('uses production searchViews staging commit and independent caps', async () => {
    expect(ARRIVAL_SORT_REVERSAL_V2.sortFiles[0]).toBe('a.ts');
    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-mv-'));
    try {
      writeFileSync(resolve(repository, 'b.ts'), 'const Foo = 1;\n', 'utf8');
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 2;\n', 'utf8');
      const counting = new CountingRunnerV2(new NodeSafeProcessRunner());
      const signal = new AbortController().signal;
      const execution = executionToken();
      const context = createBackendExecutionContextV2(
        counting,
        undefined,
        signal,
        execution,
      );
      const request = {
        base: {
          repositoryRoot: repository,
          terms: [{ value: 'Foo', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        expandedMaxHits: 10,
        legacyMaxHits: 1,
      };
      const handoff = await new RipgrepBackend(
        new NodeSafeProcessRunner(),
      ).searchViews(request, signal, context, execution);
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'ripgrep',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      expect(view.legacy.hits).toHaveLength(1);
      expect(view.legacy.hits[0]?.file).toBe('a.ts');
      expect(counting.streamCount).toBeGreaterThanOrEqual(1);
      const outcome = requireBackendExecutionOutcomeV2(
        view.expandedOutcome,
        execution,
      );
      expect(outcome.hitCount).toBeGreaterThanOrEqual(2);
      expect(outcome.selectionEligibility).toBe('complete-safe-set');
      expect(view.completeSafeHits.length).toBeGreaterThanOrEqual(2);
      expect(view.completeSafeHits[0]?.querySeedKeys.length).toBeGreaterThan(0);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({ group: 'streaming-ripgrep', caseId: 'exit-outcome-table' }),
)('F5-EXIT-001 exit/outcome', () => {
  it('covers no-start/no-child shapes and complete searchViews counters', async () => {
    expect(NO_START_NO_CHILD_PATHS_V2).toContain('generic-invalid');
    expect(NO_START_NO_CHILD_PATHS_V2).toContain('generic-pre-aborted');
    expect(NO_START_NO_CHILD_PATHS_V2).toContain(
      'availability-preparation-failure',
    );

    const abortRepo = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-abort-'));
    try {
      const aborted = new AbortController();
      aborted.abort();
      const executionAbort = executionToken();
      const contextAbort = createBackendExecutionContextV2(
        new NodeSafeProcessRunner(),
        undefined,
        aborted.signal,
        executionAbort,
      );
      const noStartHandoff = await new RipgrepBackend(
        new NodeSafeProcessRunner(),
      ).searchViews(
        {
          base: {
            repositoryRoot: abortRepo,
            terms: [{ value: 'Foo', caseSensitive: true }],
            anchors: [],
            negativeTerms: [],
            layers: [],
          },
          expandedMaxHits: 800,
          legacyMaxHits: 10,
        },
        aborted.signal,
        contextAbort,
        executionAbort,
      );
      const noStartView = requireBackendDiscoveryHandoffForF3V2(
        noStartHandoff,
        'ripgrep',
        { legacyMaxHits: 10 },
        contextAbort,
        executionAbort,
      );
      expect(noStartView.kind).toBe('no-start');
      if (noStartView.kind === 'no-start') {
        expect(noStartView.reason).toBe('pre-aborted');
        expect(noStartView.completeSafeHits).toEqual([]);
        expect(noStartView.expandedComplete).toBe(false);
      }
    } finally {
      rmSync(abortRepo, { recursive: true, force: true });
    }

    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-exit-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const counting = new CountingRunnerV2(new NodeSafeProcessRunner());
      const signal = new AbortController().signal;
      const execution = executionToken();
      const context = createBackendExecutionContextV2(
        counting,
        undefined,
        signal,
        execution,
      );
      const request = {
        base: {
          repositoryRoot: repository,
          terms: [{ value: 'Foo', caseSensitive: true }],
          anchors: [],
          negativeTerms: [],
          layers: [],
        },
        expandedMaxHits: 800,
        legacyMaxHits: 10,
      };
      const handoff = await new RipgrepBackend(
        new NodeSafeProcessRunner(),
      ).searchViews(request, signal, context, execution);
      const view = requireBackendDiscoveryHandoffForF3V2(
        handoff,
        'ripgrep',
        request,
        context,
        execution,
      );
      expect(view.kind).toBe('started');
      if (view.kind !== 'started') {
        return;
      }
      const outcome = requireBackendExecutionOutcomeV2(
        view.expandedOutcome,
        execution,
      );
      expect(outcome.status).toBe('used');
      expect(outcome.completion).toBe('complete');
      expect(outcome.selectionEligibility).toBe('complete-safe-set');
      expect(outcome.termination).toBe('none');
      expect(counting.streamCount).toBeGreaterThanOrEqual(2);
      expect(counting.runCount).toBe(0);
      expect(view.completeSafeHits.length).toBeGreaterThan(0);
      expect(view.completeSafeHits[0]?.querySeedKeys[0]).toMatch(/^q:/u);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
