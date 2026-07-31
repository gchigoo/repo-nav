import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { LocateExecutionTokenV2 } from '../../src/contracts/v2/locate-fact-envelope-v2.js';
import {
  createBackendExecutionContextV2,
  createExpandedLaneAttemptFactsV2,
  createNotObservedCodeGraphIndexObservationV2,
  finalizeBackendExecutionTraceV2,
  requireBackendExecutionOutcomeV2,
  requireBackendExecutionTraceV2,
  requireBackendPhysicalAttemptExecutorV2,
  requireExpandedBackendAttemptReducerV2,
  requireExpandedBackendLogicalAttemptV2,
  sealExpandedBackendAttemptSetV2,
  signBackendExecutionOutcomeForFactsV2,
} from '../../src/process/backend-execution-context-v2.js';
import { createProcessOpaqueTokenV2 } from '../../src/process/opaque-token-v2.js';
import { NodeSafeProcessRunner } from '../../src/repository/node-safe-process-runner.js';
import { RipgrepBackend } from '../../src/repository/ripgrep-backend.js';
import { CODEGRAPH_TERMINAL_KINDS_V2 } from '../../testkit/fixtures/backend-execution-v2/codegraph-terminal-v2.js';
import { TRACE_CLOSURE_MUTATIONS_V2 } from '../../testkit/fixtures/backend-execution-v2/trace-closure-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'codegraph-outcome-trace',
  }),
)('F5-CODEGRAPH-001 codegraph observation', () => {
  it('finalizes not-observed when no expanded codegraph starts', () => {
    expect(CODEGRAPH_TERMINAL_KINDS_V2).toContain('not-observed');
    const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
    const context = createBackendExecutionContextV2(
      new NodeSafeProcessRunner(),
      undefined,
      new AbortController().signal,
      execution,
    );
    const executor = requireBackendPhysicalAttemptExecutorV2(
      context,
      'codegraph',
      execution,
    );
    const observation = createNotObservedCodeGraphIndexObservationV2(
      executor.registry(),
      execution,
      context,
    );
    const trace = finalizeBackendExecutionTraceV2(
      context,
      observation,
      execution,
    );
    const view = requireBackendExecutionTraceV2(trace, execution);
    expect(view.codegraphIndexObservation).toEqual({ kind: 'not-observed' });
    expect(view.outcomes).toEqual([]);
  });
});

describe.runIf(
  isSelected({
    group: 'streaming-ripgrep',
    caseId: 'backend-trace-closure',
  }),
)('F5-TRACE-001 trace closure', () => {
  it('enforces seal/late-start/reducer outcome binding', async () => {
    expect(TRACE_CLOSURE_MUTATIONS_V2).toContain('late-start');
    expect(TRACE_CLOSURE_MUTATIONS_V2).toContain('missing-facts');
    expect(TRACE_CLOSURE_MUTATIONS_V2).toContain('unsettled');

    const repository = mkdtempSync(resolve(tmpdir(), 'repo-nav-f5-trace-'));
    try {
      writeFileSync(resolve(repository, 'a.ts'), 'const Foo = 1;\n', 'utf8');
      const runner = new NodeSafeProcessRunner();
      const signal = new AbortController().signal;
      const execution = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const context = createBackendExecutionContextV2(
        runner,
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
      const handoff = await new RipgrepBackend(runner).searchViews(
        request,
        signal,
        context,
        execution,
      );
      expect(handoff).toBeTruthy();

      // late-start after seal must fail
      const executor = requireBackendPhysicalAttemptExecutorV2(
        context,
        'ripgrep',
        execution,
      );
      expect(() =>
        executor.startBuffered(
          {
            backend: 'ripgrep',
            laneMask: 'expanded-and-legacy',
            kind: 'ripgrep-group',
            request: {
              executable: 'rg',
              argv: ['--version'],
              cwd: repository,
              timeoutMs: 1_000,
              maxStdoutBytes: 1024,
              maxStderrBytes: 1024,
              terminateGraceMs: 100,
            },
          },
          signal,
          execution,
        ),
      ).toThrow(/late-start/u);

      // seal again must fail
      expect(() =>
        sealExpandedBackendAttemptSetV2(context, 'ripgrep', execution),
      ).toThrow();

      // missing-facts: fresh context with settled start but no facts
      const execution2 = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const signal2 = new AbortController().signal;
      const context2 = createBackendExecutionContextV2(
        runner,
        undefined,
        signal2,
        execution2,
      );
      const executor2 = requireBackendPhysicalAttemptExecutorV2(
        context2,
        'ripgrep',
        execution2,
      );
      const prepared = await executor2.prepareAvailabilityProbe(
        {
          backend: 'ripgrep',
          argvClass: 'ripgrep-version',
          request: {
            executable: 'rg',
            argv: ['--version'],
            cwd: repository,
            timeoutMs: 5_000,
            maxStdoutBytes: 64 * 1024,
            maxStderrBytes: 16 * 1024,
            terminateGraceMs: 100,
          },
        },
        execution2,
      );
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) {
        return;
      }
      const start = executor2.startAvailabilityProbe(
        {
          backend: 'ripgrep',
          laneMask: 'expanded-and-legacy',
          kind: 'ripgrep-version',
          request: {
            executable: 'rg',
            argv: ['--version'],
            cwd: repository,
            timeoutMs: 5_000,
            maxStdoutBytes: 64 * 1024,
            maxStderrBytes: 16 * 1024,
            terminateGraceMs: 100,
          },
        },
        prepared.prepared,
        signal2,
        execution2,
      );
      await executor2.settlePhysicalAttempt(start, execution2);
      expect(() =>
        sealExpandedBackendAttemptSetV2(context2, 'ripgrep', execution2),
      ).toThrow(/missing-lane-facts|missing-facts/u);

      // reducer must prefer ripgrep-group facts over version probe placeholder
      const execution3 = createProcessOpaqueTokenV2<LocateExecutionTokenV2>();
      const signal3 = new AbortController().signal;
      const context3 = createBackendExecutionContextV2(
        runner,
        undefined,
        signal3,
        execution3,
      );
      const handoff3 = await new RipgrepBackend(runner).searchViews(
        {
          base: {
            repositoryRoot: repository,
            terms: [{ value: 'Foo', caseSensitive: true }],
            anchors: [],
            negativeTerms: [],
            layers: [],
          },
          expandedMaxHits: 800,
          legacyMaxHits: 10,
        },
        signal3,
        context3,
        execution3,
      );
      void handoff3;
      const observation = createNotObservedCodeGraphIndexObservationV2(
        requireBackendPhysicalAttemptExecutorV2(
          context3,
          'codegraph',
          execution3,
        ).registry(),
        execution3,
        context3,
      );
      const trace = finalizeBackendExecutionTraceV2(
        context3,
        observation,
        execution3,
      );
      const traceView = requireBackendExecutionTraceV2(trace, execution3);
      expect(traceView.outcomes.length).toBe(1);
      expect(traceView.outcomes[0]).not.toHaveProperty('retainedHits');
      expect(traceView.outcomes[0]).not.toHaveProperty('selectionEligibility');
      expect(traceView.firstExpandedStartOrdinals[0]).toBe(1);
      // outcome hits come from group (hitCount>0), not empty version probe
      expect(traceView.outcomes[0]?.hitCount).toBeGreaterThan(0);
      void requireExpandedBackendAttemptReducerV2;
      void requireExpandedBackendLogicalAttemptV2;
      void createExpandedLaneAttemptFactsV2;
      void signBackendExecutionOutcomeForFactsV2;
      void requireBackendExecutionOutcomeV2;
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });
});
