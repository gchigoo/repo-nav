/**
 * MCP locate transport helpers over trusted public LocateResultV2 views.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { SerializedLocateResultV2 } from '../contracts/v2/canonical-locate-execution-v2.js';
import { serializeLocateAgentViewV2 } from './locate-agent-view-v2.js';

/**
 * Serialize a trusted transport view into MCP CallToolResult.
 * structuredContent is the full schema 2.0 result; text content is the lean agent view.
 */
export function serializeLocateTransportView(
  view: SerializedLocateResultV2,
  request?: unknown,
): CallToolResult {
  return {
    structuredContent: view.value as Readonly<Record<string, unknown>>,
    content: [
      { type: 'text', text: serializeLocateAgentViewV2(view.value, request) },
    ],
    isError: !view.value.ok,
  };
}
