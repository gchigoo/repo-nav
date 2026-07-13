import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
  applyPublicErrorPolicy,
  createPublicErrorResult,
  LocateToolOutputSchema,
  type LocateResult,
  type LocateToolOutput,
} from '../contracts/index.js';
import { redactLocateResult } from '../evidence/evidence-redactor.js';

export function invalidLocateInput(addTermSuggested: boolean): LocateResult {
  return createPublicErrorResult(
    'INVALID_INPUT',
    addTermSuggested ? 'ADD_TERM' : undefined,
  );
}

export function internalLocateError(): LocateResult {
  return createPublicErrorResult('INTERNAL_ERROR');
}

export function serializeLocateToolOutput(result: LocateResult): CallToolResult {
  const output: LocateToolOutput = LocateToolOutputSchema.parse(
    redactLocateResult(applyPublicErrorPolicy(result)),
  );
  return {
    structuredContent: output as Readonly<Record<string, unknown>>,
    content: [{ type: 'text', text: JSON.stringify(output) }],
    isError: !output.ok,
  };
}
