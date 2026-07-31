import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'cli-input-contract',
  }),
)('F6-TRANSPORT-001 docs cli-input-contract', () => {
  it('keeps CLI help aligned with optional question migration', () => {
    const parser = readFileSync(
      resolve(process.cwd(), 'tools/cli/parser.ts'),
      'utf8',
    );
    expect(parser).toMatch(/Optional display-only question/);
    expect(parser).not.toMatch(/required\(flags, '--question'\)/);
  });
});
