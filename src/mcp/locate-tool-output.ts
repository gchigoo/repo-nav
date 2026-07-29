/**
 * MCP locate transport helpers over trusted public LocateResultV2 views.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { LocateResultV2 } from '../contracts/v2/locate-result-v2.js';
import type { PublicLocateTransportViewV2 } from '../evidence/locate-execution/public-locate-transport-registry-v2.js';

/**
 * Serialize a trusted transport view into MCP CallToolResult (exact value + same JSON text).
 */
export function serializeLocateTransportView(
  view: PublicLocateTransportViewV2,
): CallToolResult {
  return {
    structuredContent: view.value as Readonly<Record<string, unknown>>,
    content: [{ type: 'text', text: view.compactJson }],
    isError: !view.value.ok,
  };
}

/**
 * Serialize an already-trusted LocateResultV2 when only the value is available
 * (unexpected transport failure path — must not invent a new authority).
 */
export function serializeLocateToolOutput(
  result: LocateResultV2,
): CallToolResult {
  const compactJson = JSON.stringify(result);
  return {
    structuredContent: result as Readonly<Record<string, unknown>>,
    content: [{ type: 'text', text: compactJson }],
    isError: !result.ok,
  };
}
