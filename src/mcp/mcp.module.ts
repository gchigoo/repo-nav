import { Module } from '@nestjs/common';

import { EvidenceModule } from '../evidence/evidence.module.js';
import { MCP_STDIO_HOST } from '../runtime/tokens.js';
import { NodeMcpStdioHost } from './mcp-stdio-host.js';

@Module({
  imports: [EvidenceModule],
  providers: [
    NodeMcpStdioHost,
    {
      provide: MCP_STDIO_HOST,
      useExisting: NodeMcpStdioHost,
    },
  ],
  exports: [MCP_STDIO_HOST],
})
export class McpModule {}
