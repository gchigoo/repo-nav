/**
 * MCP locate transport helpers over trusted public LocateResultV2 views.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { SerializedLocateResultV2 } from '../contracts/v2/canonical-locate-execution-v2.js';

/**
 * Serialize a trusted transport view into MCP CallToolResult (exact value + same JSON text).
 */
export function serializeLocateTransportView(
  view: SerializedLocateResultV2,
): CallToolResult {
  return {
    structuredContent: view.value as Readonly<Record<string, unknown>>,
    content: [{ type: 'text', text: view.compactJson }],
    isError: !view.value.ok,
  };
}
