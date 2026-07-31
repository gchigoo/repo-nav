import { isDeepStrictEqual } from 'node:util';

import {
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../src/contracts/v2/locate-result-v2.js';

export interface ParsedLocateToolResult {
  readonly output: LocateResultV2;
  readonly isError: boolean;
  readonly structuredContent: LocateResultV2;
  readonly textContent: string;
}

/**
 * Parse MCP tool result and require structured/text deep-equal v2 parity.
 */
export function parseLocateToolResultParity(result: unknown): ParsedLocateToolResult {
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
  const text = LocateResultV2Schema.parse(JSON.parse(first.text) as unknown);
  if (!isDeepStrictEqual(text, structured)) {
    throw new Error('MCP structured and text output were not equal.');
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
