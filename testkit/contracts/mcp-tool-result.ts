import {
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../src/contracts/v2/locate-result-v2.js';
import {
  LocateAgentViewV2Schema,
  agentViewMatchesResultV2,
} from '../../src/mcp/locate-agent-view-v2.js';

export interface ParsedLocateToolResult {
  readonly output: LocateResultV2;
  readonly isError: boolean;
  readonly structuredContent: LocateResultV2;
  readonly textContent: string;
}

/**
 * Parse MCP tool result: structuredContent is schema 2.0, text is the agent view.
 */
export function parseLocateToolResultParity(
  result: unknown,
  request?: unknown,
): ParsedLocateToolResult {
  if (typeof result !== 'object' || result === null) {
    throw new Error('MCP tool result was not an object.');
  }
  const content =
    'content' in result && Array.isArray(result.content)
      ? (result.content as readonly unknown[])
      : undefined;
  const first = content?.[0];
  if (
    typeof first !== 'object' ||
    first === null ||
    !('type' in first) ||
    first.type !== 'text' ||
    !('text' in first) ||
    typeof first.text !== 'string'
  ) {
    throw new Error('MCP tool result did not contain one text output.');
  }
  const structured = LocateResultV2Schema.parse(
    'structuredContent' in result ? result.structuredContent : undefined,
  );
  let parsedText: unknown;
  try {
    parsedText = JSON.parse(first.text) as unknown;
  } catch {
    throw new Error('MCP text content is not JSON.');
  }
  LocateAgentViewV2Schema.parse(parsedText);
  if (!agentViewMatchesResultV2(parsedText, structured, request)) {
    throw new Error('MCP text content was not the agent-view projection.');
  }
  if (!('isError' in result) || typeof result.isError !== 'boolean') {
    throw new Error('MCP tool result did not declare isError.');
  }
  return {
    output: structured,
    isError: result.isError,
    structuredContent: structured,
    textContent: first.text,
  };
}
