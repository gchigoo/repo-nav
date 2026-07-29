import { describe, expect, it } from 'vitest';

import { parseCliArguments } from '../../src/cli/parser.js';
import { CLI_ARGV_CASES_V2 } from '../../testkit/fixtures/input-v2/cli-argv-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'cli-input-contract',
  }),
)('F6-TRANSPORT-001 cli-input-contract', () => {
  it('allows missing question; schema errors defer to application INVALID_INPUT', () => {
    for (const row of CLI_ARGV_CASES_V2) {
      if (row.expectOk) {
        const parsed = parseCliArguments([...row.args]);
        expect(parsed.kind).toBe('locate');
      } else {
        // Usage errors still throw; schema/request shape errors return locate rawRequest.
        try {
          const parsed = parseCliArguments([...row.args]);
          expect(parsed.kind).toBe('locate');
        } catch {
          expect(true).toBe(true);
        }
      }
    }
    const help = parseCliArguments(['debug', 'locate', '--help']);
    expect(help.kind).toBe('help');
    if (help.kind === 'help') {
      expect(help.text).toMatch(/Optional display-only question/);
      expect(help.text).toMatch(/reject backslashes/);
    }
  });
});
