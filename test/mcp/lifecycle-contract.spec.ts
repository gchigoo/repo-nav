import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  McpLifecycleCaseSchema,
  parseMcpStdoutFrames,
  runMcpLifecycleCase,
  type McpLifecycleCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const manifestDirectory = resolve(
  import.meta.dirname,
  '..',
  '..',
  'testkit',
  'manifests',
  'mcp',
);

function loadLifecycleCase(name: string): McpLifecycleCase {
  const input: unknown = parse(
    readFileSync(resolve(manifestDirectory, name), 'utf8'),
  );
  return McpLifecycleCaseSchema.parse(input);
}

const identity = {
  group: 'runner-smoke',
  caseId: 'lifecycle-manifest-schema',
} as const;

describe.runIf(isSelected(identity))('MCP lifecycle contract', () => {
  it('keeps lifecycle fields independent from LocateResult cases', () => {
    const lifecycleCase = loadLifecycleCase('stdio-clean-output.yaml');
    expect(lifecycleCase.scenario).toBe('stdio-clean-output');
    expect(
      McpLifecycleCaseSchema.safeParse({
        ...lifecycleCase,
        kind: 'success',
        request: { terms: ['hcp_id'] },
      }).success,
    ).toBe(false);
  });

  it('accepts only MCP frames on stdout and propagates clean exit', async () => {
    const observation = await runMcpLifecycleCase(
      loadLifecycleCase('stdio-clean-output.yaml'),
    );

    expect(observation.exitCode).toBe(0);
    expect(observation.stdoutFrames).toHaveLength(1);
    expect(observation.stderr).toBe('');
  });

  it('rejects JSON diagnostics and blank lines that are not protocol frames', () => {
    expect(() =>
      parseMcpStdoutFrames('{"jsonrpc":"2.0","debug":"not-a-frame"}\n'),
    ).toThrow();
    expect(() =>
      parseMcpStdoutFrames(
        '{"jsonrpc":"2.0","method":"notifications/initialized"}\n\n' +
          '{"jsonrpc":"2.0","method":"notifications/cancelled"}\n',
      ),
    ).toThrow(/blank line/iu);
    expect(() => parseMcpStdoutFrames('ordinary debug text\n')).toThrow();
  });

  it('drives graceful shutdown through stdin within the manifest budget', async () => {
    const lifecycleCase = loadLifecycleCase('graceful-shutdown.yaml');
    const observation = await runMcpLifecycleCase(lifecycleCase);

    expect(observation.exitCode).toBe(0);
    expect(observation.stdoutFrames).toHaveLength(2);
    expect(observation.elapsedMs).toBeLessThan(
      lifecycleCase.expected.maxShutdownMs,
    );
  });

  it('fails rather than hiding an exceeded lifecycle budget', async () => {
    const lifecycleCase = loadLifecycleCase('graceful-shutdown.yaml');
    await expect(
      runMcpLifecycleCase({
        ...lifecycleCase,
        expected: { ...lifecycleCase.expected, maxShutdownMs: 1 },
      }),
    ).rejects.toThrow(/exceeded/iu);
  });
});
