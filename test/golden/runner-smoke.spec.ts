import { describe, it } from 'vitest';

import {
  assertRunnerSurface,
  isSelected,
} from '../../testkit/testing/selection.js';

const identity = { group: 'runner-smoke', caseId: 'runner-smoke' } as const;

describe.runIf(isSelected(identity))('golden runner', () => {
  it('executes the selected golden surface', () => {
    assertRunnerSurface('golden');
  });
});
