import type { INestApplicationContext } from '@nestjs/common';

import type { McpShutdownReason, McpStdioHost } from './mcp-stdio-host.js';
import { writeScrubbedDiagnostic } from './diagnostic-scrubber.js';

export interface McpShutdownCoordinator {
  shutdown(reason: McpShutdownReason, exitCode: number): Promise<void>;
}

export interface McpShutdownReporter {
  setExitCode(exitCode: number): void;
  reportFailure(): void;
}

interface McpShutdownIntent {
  readonly reason: McpShutdownReason;
  readonly exitCode: number;
}

export interface McpStartupShutdownController {
  request(reason: McpShutdownReason, exitCode: number): void;
  bind(coordinator: McpShutdownCoordinator): Promise<void> | undefined;
}

const NODE_PROCESS_REPORTER: McpShutdownReporter = Object.freeze({
  setExitCode: (exitCode: number) => {
    process.exitCode = exitCode;
  },
  reportFailure: () => {
    writeScrubbedDiagnostic('RepoNav MCP shutdown failed.');
  },
});

export function createMcpShutdownCoordinator(
  application: Pick<INestApplicationContext, 'close'>,
  host: Pick<McpStdioHost, 'close'>,
  reporter: McpShutdownReporter = NODE_PROCESS_REPORTER,
): McpShutdownCoordinator {
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (
    reason: McpShutdownReason,
    exitCode: number,
  ): Promise<void> => {
    shutdownPromise ??= (async () => {
      let failed = false;
      try {
        await host.close(reason);
      } catch {
        failed = true;
      }
      try {
        await application.close();
      } catch {
        failed = true;
      }

      if (failed) {
        reporter.reportFailure();
        reporter.setExitCode(1);
        return;
      }
      reporter.setExitCode(exitCode);
    })();
    return shutdownPromise;
  };

  return { shutdown };
}

export function createMcpStartupShutdownController(
  reporter: McpShutdownReporter = NODE_PROCESS_REPORTER,
): McpStartupShutdownController {
  let coordinator: McpShutdownCoordinator | undefined;
  let pendingIntent: McpShutdownIntent | undefined;

  return {
    request: (reason, exitCode) => {
      if (coordinator !== undefined) {
        void coordinator.shutdown(reason, exitCode).catch(() => {
          reporter.reportFailure();
          reporter.setExitCode(1);
        });
        return;
      }
      pendingIntent ??= { reason, exitCode };
    },
    bind: (value) => {
      if (coordinator !== undefined) {
        throw new Error('MCP shutdown coordinator can only be bound once.');
      }
      coordinator = value;
      return pendingIntent === undefined
        ? undefined
        : coordinator.shutdown(pendingIntent.reason, pendingIntent.exitCode);
    },
  };
}
