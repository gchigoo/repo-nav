import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
  LocateToolOutputSchema,
  type LocateResult,
  type LocateToolOutput,
  type RepoNavToolError,
} from '../contracts/index.js';

const SAFE_ERROR_MESSAGES: Readonly<
  Record<RepoNavToolError['code'], string>
> = Object.freeze({
  INVALID_INPUT: 'Locate request does not match the required schema.',
  INVALID_REPOSITORY: 'Repository root is invalid or unavailable.',
  PATH_OUTSIDE_ROOT: 'Repository path is outside the configured root.',
  INTERNAL_ERROR: 'Repository evidence request failed.',
});

export function invalidLocateInput(addTermSuggested: boolean): LocateResult {
  return {
    ok: false,
    error: {
      code: 'INVALID_INPUT',
      message: SAFE_ERROR_MESSAGES.INVALID_INPUT,
      recoverable: true,
      ...(addTermSuggested ? { suggestedAction: 'ADD_TERM' as const } : {}),
    },
  };
}

export function internalLocateError(): LocateResult {
  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: SAFE_ERROR_MESSAGES.INTERNAL_ERROR,
      recoverable: false,
    },
  };
}

function applySafeMessagePolicy(result: LocateResult): LocateResult {
  if (result.ok) {
    return result;
  }
  return {
    ok: false,
    error: {
      ...result.error,
      message: SAFE_ERROR_MESSAGES[result.error.code],
    },
  };
}

export function serializeLocateToolOutput(result: LocateResult): CallToolResult {
  const output: LocateToolOutput = LocateToolOutputSchema.parse(
    applySafeMessagePolicy(result),
  );
  return {
    structuredContent: output as Readonly<Record<string, unknown>>,
    content: [{ type: 'text', text: JSON.stringify(output) }],
    isError: !output.ok,
  };
}
