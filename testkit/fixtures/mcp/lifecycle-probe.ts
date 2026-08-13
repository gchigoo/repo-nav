import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app/app.module.js';
import {
  requireCallerSignal,
  type LocateExecutionContext,
  type LocateRequest,
  type RepositoryEvidenceService,
} from '../../../src/contracts/index.js';
import { PUBLIC_LOCATE_EXECUTION_APPLICATION_V2 } from '../../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import type { McpStdioHost } from '../../../src/mcp/mcp-stdio-host.js';
import { NodeSafeProcessRunner } from '../../../src/repository/node-safe-process-runner.js';
import { MCP_STDIO_HOST } from '../../../src/runtime/tokens.js';
import { createFixtureLocateApplication } from './create-fixture-locate-application.js';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Lifecycle probe environment ${name} is required.`);
  }
  return value;
}

const contextMarker = requiredEnvironment('REPO_NAV_LIFECYCLE_CONTEXT_MARKER');
const pidFile = requiredEnvironment('REPO_NAV_LIFECYCLE_PID_FILE');
type LifecycleProbeFault =
  | 'skip-context-close'
  | 'leave-child-running'
  | 'force-timeout'
  | 'force-nonzero-exit';

function readProbeFault(): LifecycleProbeFault | undefined {
  const value = process.env['REPO_NAV_LIFECYCLE_PROBE_FAULT'];
  switch (value) {
    case undefined:
    case 'skip-context-close':
    case 'leave-child-running':
    case 'force-timeout':
    case 'force-nonzero-exit':
      return value;
    default:
      throw new Error(`Unsupported lifecycle probe fault: ${value}.`);
  }
}

const probeFault = readProbeFault();

const descendantScript = [
  "import { spawn } from 'node:child_process';",
  "import { writeFileSync } from 'node:fs';",
  "const descendant = spawn(process.execPath, ['--input-type=module', '--eval', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });",
  "if (descendant.pid === undefined) { throw new Error('descendant pid unavailable'); }",
  'writeFileSync(process.env.REPO_NAV_LIFECYCLE_PID_FILE, JSON.stringify({ directPid: process.pid, descendantPid: descendant.pid }));',
  'setInterval(() => {}, 1000);',
].join('\n');

class ProbeEvidenceService implements RepositoryEvidenceService {
  private readonly runner = new NodeSafeProcessRunner();

  public async locate(
    _request: LocateRequest,
    context: LocateExecutionContext,
  ): Promise<any> {
    if (probeFault === 'leave-child-running') {
      const leaked = spawn(
        process.execPath,
        ['--input-type=module', '--eval', descendantScript],
        {
          cwd: resolve(import.meta.dirname, '..', '..', '..'),
          detached: true,
          env: { ...process.env, REPO_NAV_LIFECYCLE_PID_FILE: pidFile },
          stdio: 'ignore',
          windowsHide: true,
        },
      );
      leaked.unref();
      const callerSignal = requireCallerSignal(context);
      await new Promise<void>((resolveAbort) => {
        if (callerSignal.aborted) {
          resolveAbort();
          return;
        }
        callerSignal.addEventListener('abort', () => resolveAbort(), {
          once: true,
        });
      });
      return {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Lifecycle leak probe completed.' as any,
          recoverable: false,
        },
      };
    }
    await this.runner.run(
      {
        executable: process.execPath,
        argv: ['--input-type=module', '--eval', descendantScript],
        cwd: resolve(import.meta.dirname, '..', '..', '..'),
        env: { REPO_NAV_LIFECYCLE_PID_FILE: pidFile },
        timeoutMs: 30_000,
        maxStdoutBytes: 1_024,
        maxStderrBytes: 1_024,
        terminateGraceMs: 100,
      },
      requireCallerSignal(context),
    );
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lifecycle probe completed.' as any,
        recoverable: false,
      },
    };
  }
}

const closeProbe = {
  onModuleDestroy: (): void => {
    if (probeFault !== 'skip-context-close') {
      writeFileSync(contextMarker, 'closed\n', 'utf8');
    }
  },
};

async function runProbe(): Promise<void> {
  const application = await Test.createTestingModule({
    imports: [AppModule],
    providers: [{ provide: 'LIFECYCLE_CLOSE_PROBE', useValue: closeProbe }],
  })
    .overrideProvider(PUBLIC_LOCATE_EXECUTION_APPLICATION_V2)
    .useValue(createFixtureLocateApplication(new ProbeEvidenceService()))
    .compile();
  const host = application.get<McpStdioHost>(MCP_STDIO_HOST);
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    shutdownPromise ??= (async () => {
      await host.close('eof');
      await application.close();
    })();
    return shutdownPromise;
  };
  process.stdin.once('end', () => {
    if (probeFault === 'force-timeout') {
      return;
    }
    if (probeFault === 'force-nonzero-exit') {
      process.exit(7);
    }
    void shutdown().catch(() => {
      process.exitCode = 1;
    });
  });
  await host.connect();
}

void runProbe().catch(() => {
  process.exitCode = 1;
});
