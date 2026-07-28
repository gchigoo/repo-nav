import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  createMcpShutdownCoordinator,
  createMcpStartupShutdownController,
  NodeMcpStdioHost,
  type McpShutdownReporter,
  type RepositoryEvidenceService,
} from '../../src/index.js';
import {
  McpLifecycleCaseSchema,
  McpLifecycleCaseRunner,
  evaluateMcpLifecycleCase,
  parseMcpStdoutFrames,
  runMcpLifecycleCase,
  runMcpTransportErrorCase,
  type McpLifecycleCase,
  type McpLifecycleProbeAudit,
} from '../../testkit/contracts/index.js';
import { recordPlatformAssertionMarker } from '../../testkit/testing/platform-contract.js';
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

function writeLifecycleReport(
  caseId: string,
  observation: {
    readonly exitCode: number;
    readonly stdoutFrames: readonly Readonly<Record<string, unknown>>[];
    readonly elapsedMs: number;
    readonly contextClosed: boolean | null;
    readonly childrenCleaned: boolean | null;
  },
): void {
  const outputDirectory = resolve(
    import.meta.dirname,
    '..',
    '..',
    'test-artifacts',
    'lifecycle',
  );
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, `${caseId}.json`),
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        caseId,
        exitCode: observation.exitCode,
        frameCount: observation.stdoutFrames.length,
        elapsedMs: observation.elapsedMs,
        contextClosed: observation.contextClosed,
        childrenCleaned: observation.childrenCleaned,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function expectProbeAuditCleaned(
  audit: McpLifecycleProbeAudit | undefined,
): void {
  expect(audit).toBeDefined();
  if (audit === undefined) {
    throw new Error('Lifecycle probe audit was not observed.');
  }
  expect(audit.directPid).not.toBeNull();
  expect(audit.descendantPid).not.toBeNull();
  expect(existsSync(audit.directory)).toBe(false);
  if (audit.directPid !== null) {
    expect(processIsAlive(audit.directPid)).toBe(false);
  }
  if (audit.descendantPid !== null) {
    expect(processIsAlive(audit.descendantPid)).toBe(false);
  }
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
});

describe.runIf(
  isSelected({ group: 'lifecycle', caseId: 'stdio-clean-output' }),
)('MCP production stdout', () => {
  it('accepts only real MCP frames on stdout and propagates clean exit', async () => {
    const observation = await new McpLifecycleCaseRunner().run(
      loadLifecycleCase('stdio-clean-output.yaml'),
    );

    expect(observation.exitCode).toBe(0);
    expect(observation.stdoutFrames).toHaveLength(3);
    expect(observation.stdoutFrames[0]).toMatchObject({
      id: 1,
      result: { capabilities: { tools: { listChanged: false } } },
    });
    expect(observation.stdoutFrames[1]).toMatchObject({
      id: 2,
      result: { tools: [{ name: 'repo_nav_locate' }] },
    });
    expect(observation.stdoutFrames[2]).toMatchObject({
      id: 3,
      result: {
        isError: true,
        structuredContent: {
          ok: false,
          error: { code: 'INVALID_INPUT' },
        },
      },
    });
    expect(observation.stderr).toBe('');
    expect(observation.contextClosed).toBeNull();
    expect(observation.childrenCleaned).toBeNull();
    writeLifecycleReport('stdio-clean-output', observation);
  });
});

describe.runIf(
  isSelected({ group: 'lifecycle', caseId: 'stdio-graceful-shutdown' }),
)('MCP production shutdown', () => {
  it('treats an SDK transport parse failure as fatal without stdout pollution', async () => {
    const observation = await runMcpTransportErrorCase(5_000);
    expect(observation.exitCode).toBe(1);
    expect(observation.stdoutFrames).toEqual([]);
    expect(observation.stderr).toBe('');
  });

  it('keeps a host closed when connect and close overlap', async () => {
    const host = new NodeMcpStdioHost({
      locate: async () => {
        throw new Error('Not called by lifecycle test.');
      },
    });
    const privateHost = host as unknown as {
      server: {
        connect(): Promise<void>;
        close(): Promise<void>;
      };
      readonly state: string;
    };
    let releaseConnect: (() => void) | undefined;
    privateHost.server.connect = async () => {
      await new Promise<void>((resolveConnect) => {
        releaseConnect = resolveConnect;
      });
    };
    privateHost.server.close = async () => undefined;

    const connecting = host.connect();
    const closing = host.close('signal');
    releaseConnect?.();
    await connecting;
    await closing;

    expect(privateHost.state).toBe('closed');
    expect(host.close('eof')).toBe(closing);
  });

  it('queues a shutdown intent until the application coordinator is ready', async () => {
    const calls: string[] = [];
    const startup = createMcpStartupShutdownController();
    startup.request('signal', 0);
    const pending = startup.bind({
      shutdown: async (reason, exitCode) => {
        calls.push(`${reason}:${exitCode}`);
      },
    });

    expect(pending).toBeDefined();
    await pending;
    expect(calls).toEqual(['signal:0']);
  });

  it('settles tracked calls and closes state even when the SDK server close fails', async () => {
    const service: RepositoryEvidenceService = {
      locate: async () => {
        throw new Error('Not called by lifecycle test.');
      },
    };
    const host = new NodeMcpStdioHost(service);
    const privateHost = host as unknown as {
      readonly server: { close(): Promise<void> };
      readonly trackedCalls: Set<{
        readonly controller: AbortController;
        readonly settled: Promise<void>;
        settle(): void;
      }>;
    };
    privateHost.server.close = async () => {
      throw new Error('synthetic server close failure');
    };
    let settle: (() => void) | undefined;
    const tracked = {
      controller: new AbortController(),
      settled: new Promise<void>((resolveTracked) => {
        settle = resolveTracked;
      }),
      settle: () => settle?.(),
    };
    privateHost.trackedCalls.add(tracked);

    const close = host.close('transport-error');
    expect(tracked.controller.signal.aborted).toBe(true);
    settle?.();
    await expect(close).rejects.toThrow('MCP stdio host close failed.');
    expect(host.close('signal')).toBe(close);
    await expect(host.connect()).rejects.toThrow(/only connect once/iu);
  });

  it('attempts application cleanup once after host close failure', async () => {
    const calls: string[] = [];
    const host = {
      connect: async () => undefined,
      close: async () => {
        calls.push('host.close');
        throw new Error('synthetic host close failure');
      },
    };
    const application = {
      close: async () => {
        calls.push('application.close');
      },
    };
    const reporter: McpShutdownReporter = {
      reportFailure: () => calls.push('reportFailure'),
      setExitCode: (exitCode) => calls.push(`exit:${exitCode}`),
    };
    const coordinator = createMcpShutdownCoordinator(
      application,
      host,
      reporter,
    );

    const first = coordinator.shutdown('transport-error', 0);
    const second = coordinator.shutdown('signal', 0);
    expect(second).toBe(first);
    await first;
    expect(calls).toEqual([
      'host.close',
      'application.close',
      'reportFailure',
      'exit:1',
    ]);
  });

  it('reports application close failure after a successful host close', async () => {
    const calls: string[] = [];
    const coordinator = createMcpShutdownCoordinator(
      {
        close: async () => {
          calls.push('application.close');
          throw new Error('synthetic application close failure');
        },
      },
      {
        close: async () => {
          calls.push('host.close');
        },
      },
      {
        reportFailure: () => calls.push('reportFailure'),
        setExitCode: (exitCode) => calls.push(`exit:${exitCode}`),
      },
    );

    await coordinator.shutdown('transport-error', 0);
    expect(calls).toEqual([
      'host.close',
      'application.close',
      'reportFailure',
      'exit:1',
    ]);
  });

  it('returns one close promise and rejects reconnect after shutdown', async () => {
    const service: RepositoryEvidenceService = {
      locate: async () => ({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Not called by lifecycle test.',
          recoverable: false,
        },
      }),
    };
    const host = new NodeMcpStdioHost(service);
    const firstClose = host.close('eof');
    const secondClose = host.close('signal');
    expect(secondClose).toBe(firstClose);
    await firstClose;
    await expect(host.connect()).rejects.toThrow(/only connect once/iu);
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
    expect(observation.stdoutFrames).toHaveLength(3);
    expect(observation.elapsedMs).toBeLessThan(
      lifecycleCase.expected.maxShutdownMs,
    );
    writeLifecycleReport('graceful-shutdown', observation);
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

  it('rejects unclosed context and tracked-child observations', () => {
    const lifecycleCase = loadLifecycleCase('shutdown-cleanup-probe.yaml');
    expect(
      evaluateMcpLifecycleCase(lifecycleCase, {
        exitCode: 0,
        stdoutFrames: [{ jsonrpc: '2.0', id: 1, result: {} }],
        stderr: '',
        elapsedMs: 1,
        contextClosed: false,
        childrenCleaned: false,
      }).map(({ path }) => path),
    ).toEqual(['contextClosed', 'childrenCleaned']);
  });
});

describe.runIf(
  isSelected({ group: 'lifecycle', caseId: 'shutdown-cleanup-probe' }),
)('MCP instrumented shutdown cleanup', () => {
  const lifecycleCase = loadLifecycleCase('shutdown-cleanup-probe.yaml');

  it(
    'observes the real Nest context hook and direct/descendant process cleanup',
    async () => {
      const observation = await new McpLifecycleCaseRunner().run(lifecycleCase);

      expect(observation.exitCode).toBe(0);
      expect(observation.contextClosed).toBe(true);
      expect(observation.childrenCleaned).toBe(true);
      writeLifecycleReport('shutdown-cleanup-probe', observation);
      recordPlatformAssertionMarker(
        'F4-MCP-002',
        'real-close-and-tree-cleanup',
      );
    },
    10_000,
  );

  it(
    'fails when the real context close marker is deliberately skipped',
    async () => {
      await expect(
        new McpLifecycleCaseRunner({ probeFault: 'skip-context-close' }).run(
          lifecycleCase,
        ),
      ).rejects.toThrow(/contextClosed/iu);
      recordPlatformAssertionMarker('F4-MCP-002', 'missing-close-negative');
    },
    10_000,
  );

  it(
    'fails when an actual descendant tree is deliberately left running',
    async () => {
      await expect(
        new McpLifecycleCaseRunner({ probeFault: 'leave-child-running' }).run(
          lifecycleCase,
        ),
      ).rejects.toThrow(/childrenCleaned/iu);
      recordPlatformAssertionMarker('F4-MCP-002', 'live-descendant-negative');
    },
    10_000,
  );

  it(
    'cleans both child PIDs and the probe directory after a forced timeout',
    async () => {
      let audit: McpLifecycleProbeAudit | undefined;
      await expect(
        new McpLifecycleCaseRunner({
          probeFault: 'force-timeout',
          onProbeAudit: (value) => {
            audit = value;
          },
        }).run({
          ...lifecycleCase,
          expected: { ...lifecycleCase.expected, maxShutdownMs: 2_500 },
        }),
      ).rejects.toThrow(/exceeded/iu);
      expectProbeAuditCleaned(audit);
      recordPlatformAssertionMarker('F4-MCP-002', 'timeout-cleanup');
    },
    10_000,
  );

  it(
    'cleans both child PIDs and the probe directory after a nonzero exit',
    async () => {
      let audit: McpLifecycleProbeAudit | undefined;
      await expect(
        new McpLifecycleCaseRunner({
          probeFault: 'force-nonzero-exit',
          onProbeAudit: (value) => {
            audit = value;
          },
        }).run(lifecycleCase),
      ).rejects.toThrow(/exit code 7/iu);
      expectProbeAuditCleaned(audit);
      recordPlatformAssertionMarker('F4-MCP-002', 'nonzero-cleanup');
    },
    10_000,
  );
});
