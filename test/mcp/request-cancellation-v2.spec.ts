import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_NAV_LOCATE_INPUT_SCHEMA } from '../../src/mcp/locate-tool-schema.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'mcp-input-and-cancel',
  }),
)('F6-TRANSPORT-001 mcp-input-and-cancel', () => {
  it('makes question optional and maps cancel/shutdown as callerSignal', () => {
    const required = (REPO_NAV_LOCATE_INPUT_SCHEMA as { required?: string[] })
      .required;
    expect(required).toContain('repoPath');
    expect(required).toContain('terms');
    expect(required ?? []).not.toContain('question');
    const host = readFileSync(
      resolve(process.cwd(), 'src/mcp/mcp-stdio-host.ts'),
      'utf8',
    );
    expect(host).toMatch(/callerSignal:/);
    expect(host).toMatch(/SDK cancel/);
  });
});
