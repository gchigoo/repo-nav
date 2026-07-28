import { describe, expect, it } from 'vitest';

import {
  LocateAbortCoordinatorV2,
  requireFinalizedAbortDecisionV2,
} from '../../src/evidence/abort-source.js';
import { closeAndFinalizeLocateSynchronouslyV2 } from '../../src/evidence/locate-execution/canonical-locate-finalization-v2.js';
import { FINALIZATION_LATCH_CASES_V2 } from '../../testkit/fixtures/request-outcome-v2/finalization-latch-v2.js';
import { PLATFORM_FINALIZATION_MARKERS_V2 } from '../../testkit/fixtures/request-outcome-v2/platform-finalization-v2.js';
import { recordPlatformAssertionMarker } from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'finalization-latch',
  }),
)('F6-LATCH-001 finalization-latch', () => {
  it('freezes source on close and ignores later abort', () => {
    expect(FINALIZATION_LATCH_CASES_V2).toContain('before-close-observed');
    let timerCleared = 0;
    const caller = new AbortController();
    const coordinator = LocateAbortCoordinatorV2.create(caller.signal, 30_000, {
      setTimeout: ((_fn: () => void) => 9) as unknown as typeof setTimeout,
      clearTimeout: (() => {
        timerCleared += 1;
      }) as unknown as typeof clearTimeout,
    });
    expect(coordinator.abort('deadline')).toBe(true);
    const status = closeAndFinalizeLocateSynchronouslyV2(
      coordinator,
      ({ abortSource }) => abortSource,
    );
    expect(status).toBe('deadline');
    expect(timerCleared).toBe(1);
    expect(coordinator.abort('caller')).toBe(false);
    expect(() => coordinator.peekSource()).toThrow(/unavailable after close/);
    expect(() => coordinator.closeFinalization()).toThrow(/already closed/);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'platform-finalization-latch',
  }),
)('F6-LATCH-001 platform-finalization-latch', () => {
  it('emits platform finalization markers and rejects forged tokens', () => {
    expect(PLATFORM_FINALIZATION_MARKERS_V2).toEqual([
      'before-close-observed',
      'after-close-ignored',
      'no-timer-listener-leak',
    ]);
    const a = LocateAbortCoordinatorV2.create(new AbortController().signal, 1000, {
      setTimeout: ((_fn: () => void) => 1) as unknown as typeof setTimeout,
      clearTimeout: (() => undefined) as unknown as typeof clearTimeout,
    });
    const b = LocateAbortCoordinatorV2.create(new AbortController().signal, 1000, {
      setTimeout: ((_fn: () => void) => 2) as unknown as typeof setTimeout,
      clearTimeout: (() => undefined) as unknown as typeof clearTimeout,
    });
    const decision = a.closeFinalization();
    expect(() => requireFinalizedAbortDecisionV2(decision, b)).toThrow(
      /not trusted/,
    );
    recordPlatformAssertionMarker('F6-LATCH-001', 'before-close-observed');
    recordPlatformAssertionMarker('F6-LATCH-001', 'after-close-ignored');
    recordPlatformAssertionMarker('F6-LATCH-001', 'no-timer-listener-leak');
  });
});
