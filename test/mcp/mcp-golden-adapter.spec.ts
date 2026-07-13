import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  GoldenCaseSchema,
  assertGoldenCase,
  connectMcpStdioFixture,
  parseLocateToolResultParity,
  type GoldenCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const identity = {
  group: 'mcp-surface',
  caseId: 'mcp-golden-adapter',
} as const;

function loadCase(name: string): GoldenCase {
  const input: unknown = parse(
    readFileSync(
      resolve(
        import.meta.dirname,
        '..',
        '..',
        'testkit',
        'manifests',
        'golden',
        name,
      ),
      'utf8',
    ),
  );
  return GoldenCaseSchema.parse(input);
}

describe.runIf(isSelected(identity))('MCP Golden observation adapter', () => {
  it('feeds both success and error transport observations to the shared evaluator', async () => {
    const session = await connectMcpStdioFixture();
    try {
      const successRaw = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'source-field-mapping',
          terms: ['hcp_id', 'hcpId'],
        },
      });
      const success = parseLocateToolResultParity(successRaw);
      expect(() =>
        assertGoldenCase(loadCase('mcp-source-field-mapping.yaml'), {
          result: success.output,
          mcpIsError: success.isError,
          structuredContent: success.structuredContent,
          textContent: success.textContent,
        }),
      ).not.toThrow();

      const errorRaw = await session.client.callTool({
        name: 'repo_nav_locate',
        arguments: {
          repoPath: 'D:/fixture/repository',
          question: 'missing terms',
          terms: [],
        },
      });
      const error = parseLocateToolResultParity(errorRaw);
      expect(() =>
        assertGoldenCase(loadCase('manifest-schema-error.yaml'), {
          result: error.output,
          mcpIsError: error.isError,
          structuredContent: error.structuredContent,
          textContent: error.textContent,
        }),
      ).not.toThrow();
    } finally {
      await session.close();
    }
  });
});
