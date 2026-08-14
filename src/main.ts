#!/usr/bin/env node

import type { INestApplicationContext } from '@nestjs/common';

import { createRepoNavApplicationContext } from './app/create-application-context.js';
import type { McpShutdownReason, McpStdioHost } from './mcp/mcp-stdio-host.js';
import {
  createMcpShutdownCoordinator,
  createMcpStartupShutdownController,
  type McpShutdownCoordinator,
} from './mcp/mcp-shutdown-coordinator.js';
import { writeScrubbedDiagnostic } from './mcp/diagnostic-scrubber.js';
import { MCP_STDIO_HOST } from './runtime/tokens.js';

function installProcessShutdownHandlers(
  requestShutdown: (reason: McpShutdownReason, exitCode: number) => void,
): void {
  process.stdin.once('end', () => {
    requestShutdown('eof', 0);
  });
  process.stdin.once('error', () => {
    requestShutdown('transport-error', 1);
  });
  process.stdout.once('error', () => {
    requestShutdown('transport-error', 1);
  });
  process.once('SIGINT', () => {
    requestShutdown('signal', 0);
  });
  process.once('SIGTERM', () => {
    requestShutdown('signal', 0);
  });
}

async function bootstrap(): Promise<void> {
  const startupShutdown = createMcpStartupShutdownController();
  installProcessShutdownHandlers((reason, exitCode) =>
    startupShutdown.request(reason, exitCode),
  );
  let application: INestApplicationContext | undefined;
  let coordinator: McpShutdownCoordinator | undefined;
  try {
    application = await createRepoNavApplicationContext();
    const host = application.get<McpStdioHost>(MCP_STDIO_HOST);
    host.setTransportErrorHandler(() =>
      startupShutdown.request('transport-error', 1),
    );
    coordinator = createMcpShutdownCoordinator(application, host);
    const pendingShutdown = startupShutdown.bind(coordinator);
    if (pendingShutdown !== undefined) {
      await pendingShutdown;
      return;
    }
    await host.connect();
  } catch {
    writeScrubbedDiagnostic('RepoNav MCP bootstrap failed.');
    if (coordinator !== undefined) {
      await coordinator.shutdown('bootstrap-error', 1);
    } else if (application !== undefined) {
      await Promise.allSettled([application.close()]);
      process.exitCode = 1;
    } else {
      process.exitCode = 1;
    }
  }
}

void bootstrap().catch(() => {
  writeScrubbedDiagnostic('RepoNav MCP bootstrap failed.');
  process.exitCode = 1;
});
