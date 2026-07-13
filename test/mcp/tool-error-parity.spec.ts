import { describe, expect, it } from 'vitest';

import type { RepoNavToolError } from '../../src/contracts/index.js';
import {
  connectMcpStdioFixture,
  parseLocateToolResultParity,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const baseArguments = {
  repoPath: 'D:/fixture/repository',
  question: 'valid request',
  terms: ['hcp_id'],
} as const;

function selected(caseId: string): boolean {
  return isSelected({ group: 'mcp-surface', caseId });
}

function expectSafeError(
  output: ReturnType<typeof parseLocateToolResultParity>,
  code: RepoNavToolError['code'],
): void {
  expect(output.isError).toBe(true);
  expect(output.output.ok).toBe(false);
  if (output.output.ok) {
    throw new Error('Expected a RepoNav tool error.');
  }
  expect(output.output.error.code).toBe(code);
  expect(output.output.error.message).not.toMatch(
    /(?:[a-z]:[\\/]|\\private\\|\n\s*at\s|raw stderr)/iu,
  );
}

describe.runIf(selected('invalid-input'))('MCP invalid input mapping', () => {
  it('maps schema-invalid objects to typed parity output', async () => {
    const session = await connectMcpStdioFixture();
    const invalidArguments: readonly {
      readonly argumentsValue: Readonly<Record<string, unknown>>;
      readonly suggestedAction: 'ADD_TERM' | undefined;
    }[] = [
      {
        argumentsValue: {
          repoPath: 'D:/fixture/repository',
          question: 'missing terms',
        },
        suggestedAction: 'ADD_TERM',
      },
      {
        argumentsValue: { ...baseArguments, terms: 'hcp_id' },
        suggestedAction: 'ADD_TERM',
      },
      {
        argumentsValue: { ...baseArguments, question: 'x'.repeat(20_000) },
        suggestedAction: undefined,
      },
    ];
    try {
      for (const invalid of invalidArguments) {
        const result = await session.client.callTool({
          name: 'repo_nav_locate',
          arguments: invalid.argumentsValue,
        });
        const parsed = parseLocateToolResultParity(result);
        expectSafeError(parsed, 'INVALID_INPUT');
        if (!parsed.output.ok) {
          expect(parsed.output.error.recoverable).toBe(true);
          expect(parsed.output.error.suggestedAction).toBe(
            invalid.suggestedAction,
          );
        }
      }
    } finally {
      await session.close();
    }
  });
});

async function verifyServiceError(
  question: string,
  code: RepoNavToolError['code'],
): Promise<void> {
  const session = await connectMcpStdioFixture();
  try {
    const result = await session.client.callTool({
      name: 'repo_nav_locate',
      arguments: { ...baseArguments, question },
    });
    const parsed = parseLocateToolResultParity(result);
    expectSafeError(parsed, code);
    if (!parsed.output.ok) {
      expect(parsed.output.error.recoverable).toBe(false);
      expect(parsed.output.error.suggestedAction).toBeUndefined();
    }
  } finally {
    await session.close();
  }
}

describe.runIf(selected('invalid-repo'))('MCP invalid repository mapping', () => {
  it('preserves the typed code while sanitizing unsafe detail', async () => {
    await verifyServiceError('error:INVALID_REPOSITORY', 'INVALID_REPOSITORY');
  });
});

describe.runIf(selected('path-outside-root'))('MCP path boundary mapping', () => {
  it('preserves the typed code while sanitizing unsafe detail', async () => {
    await verifyServiceError('error:PATH_OUTSIDE_ROOT', 'PATH_OUTSIDE_ROOT');
  });
});

describe.runIf(selected('internal-error-parity'))(
  'MCP internal exception mapping',
  () => {
    it('turns thrown failures into safe typed parity output', async () => {
      await verifyServiceError('throw:INTERNAL_ERROR', 'INTERNAL_ERROR');
    });
  },
);
