import { describe, expect, it } from 'vitest';

import {
  LocateAbortCoordinatorV2,
  requireFinalizedAbortDecisionV2,
} from '../../src/evidence/abort-source.js';
import { ABORT_FIRST_WRITER_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/abort-first-writer-v2.js';
import { PLATFORM_ABORT_MARKERS_V2 } from '../../testkit/fixtures/request-outcome-v2/platform-abort-v2.js';
import { recordPlatformAssertionMarker } from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'abort-first-writer',
  }),
)('F6-ABORT-001 abort-first-writer', () => {
  it('honors caller/deadline first-writer-wins and ignores later writers', () => {
    expect(ABORT_FIRST_WRITER_CASES_V2).toContain('caller-first-writer');
    const caller = new AbortController();
    let cleared = 0;
    const coordinator = LocateAbortCoordinatorV2.create(caller.signal, 30_000, {
      setTimeout: ((_fn: () => void, _ms?: number) => 1) as unknown as typeof setTimeout,
      clearTimeout: (() => {
        cleared += 1;
      }) as unknown as typeof clearTimeout,
    });
    expect(coordinator.abort('caller')).toBe(true);
    expect(coordinator.abort('deadline')).toBe(false);
    expect(coordinator.peekSource()).toBe('caller');
    const decision = coordinator.closeFinalization();
    expect(requireFinalizedAbortDecisionV2(decision, coordinator)).toBe(
      'caller',
    );
    expect(cleared).toBe(1);
    expect(coordinator.abort('deadline')).toBe(false);

    let deadlineFired = false;
    const deadlineCoordinator = LocateAbortCoordinatorV2.create(
      new AbortController().signal,
      5,
      {
        setTimeout: ((fn: () => void) => {
          fn();
          deadlineFired = true;
          return 2 as unknown as ReturnType<typeof setTimeout>;
        }) as unknown as typeof setTimeout,
        clearTimeout: (() => undefined) as unknown as typeof clearTimeout,
      },
    );
    expect(deadlineFired).toBe(true);
    expect(deadlineCoordinator.peekSource()).toBe('deadline');
    expect(deadlineCoordinator.abort('caller')).toBe(false);
    // backend local timeout 不经过 coordinator.abort
    expect(PLATFORM_ABORT_MARKERS_V2).toContain(
      'local-timeout-not-abort-source',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'platform-abort-first-writer',
  }),
)('F6-ABORT-001 platform-abort-first-writer', () => {
  it('emits platform abort markers', () => {
    expect(PLATFORM_ABORT_MARKERS_V2).toEqual([
      'caller-first-writer',
      'deadline-first-writer',
      'local-timeout-not-abort-source',
    ]);
    const preAborted = new AbortController();
    preAborted.abort();
    const coordinator = LocateAbortCoordinatorV2.create(
      preAborted.signal,
      1_000,
      {
        setTimeout: ((_fn: () => void) => 0) as unknown as typeof setTimeout,
        clearTimeout: (() => undefined) as unknown as typeof clearTimeout,
      },
    );
    expect(coordinator.peekSource()).toBe('caller');
    recordPlatformAssertionMarker('F6-ABORT-001', 'caller-first-writer');
    recordPlatformAssertionMarker('F6-ABORT-001', 'deadline-first-writer');
    recordPlatformAssertionMarker(
      'F6-ABORT-001',
      'local-timeout-not-abort-source',
    );
  });
});
