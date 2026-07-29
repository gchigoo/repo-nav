import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app/app.module.js';
import { PUBLIC_LOCATE_EXECUTION_APPLICATION_V2 } from '../../../src/evidence/locate-execution/public-locate-execution-application-v2.js';
import type { McpStdioHost } from '../../../src/mcp/mcp-stdio-host.js';
import { MCP_STDIO_HOST } from '../../../src/runtime/tokens.js';
import { createFixtureLocateApplication } from './create-fixture-locate-application.js';
import { FixtureEvidenceService } from './fixture-evidence.service.js';

async function runFixture(): Promise<void> {
  const application = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PUBLIC_LOCATE_EXECUTION_APPLICATION_V2)
    .useValue(createFixtureLocateApplication(new FixtureEvidenceService()))
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
