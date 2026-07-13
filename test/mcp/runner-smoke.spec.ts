import { describe, it } from 'vitest';

import {
  assertRunnerSurface,
  isSelected,
} from '../../testkit/testing/selection.js';

const identity = { group: 'runner-smoke', caseId: 'runner-smoke' } as const;

describe.runIf(isSelected(identity))('MCP runner', () => {
  it('executes the selected MCP surface', () => {
    assertRunnerSurface('mcp');
  });
});
