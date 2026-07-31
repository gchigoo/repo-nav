import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { readPackageVersionForServer } from '../runtime/package-metadata.js';
import {
  REPO_NAV_LOCATE_TOOL,
  REPO_NAV_LOCATE_TOOL_NAME,
} from './locate-tool-schema.js';

export type LocateToolCallHandler = (
  argumentsValue: Readonly<Record<string, unknown>> | undefined,
  signal: AbortSignal,
) => Promise<CallToolResult>;

export function createRepoNavMcpServer(
  handleLocate: LocateToolCallHandler,
): Server {
  const server = new Server(
    { name: 'repo-nav', version: readPackageVersionForServer() },
    { capabilities: { tools: { listChanged: false } } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [REPO_NAV_LOCATE_TOOL],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (request.params.name !== REPO_NAV_LOCATE_TOOL_NAME) {
      throw new McpError(ErrorCode.InvalidParams, 'Unknown tool.');
    }
    return await handleLocate(request.params.arguments, extra.signal);
  });

  return server;
}
