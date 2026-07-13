import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app/app.module.js';
import type { McpStdioHost } from '../../../src/mcp/mcp-stdio-host.js';
import {
  MCP_STDIO_HOST,
  REPOSITORY_EVIDENCE_SERVICE,
} from '../../../src/runtime/tokens.js';
import { FixtureEvidenceService } from './fixture-evidence.service.js';

async function runFixture(): Promise<void> {
  const application = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(REPOSITORY_EVIDENCE_SERVICE)
    .useValue(new FixtureEvidenceService())
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
    void shutdown().catch(() => {
      process.stderr.write('MCP fixture shutdown failed.\n');
      process.exitCode = 1;
    });
  });

  await host.connect();
}

void runFixture().catch(() => {
  process.stderr.write('MCP fixture bootstrap failed.\n');
  process.exitCode = 1;
});
