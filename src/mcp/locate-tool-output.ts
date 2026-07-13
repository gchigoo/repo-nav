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

export function createLocateToolOutput(result: LocateResult): LocateToolOutput {
  return LocateToolOutputSchema.parse(
    redactLocateResult(applyPublicErrorPolicy(result)),
  );
}

export function serializeLocateToolOutput(result: LocateResult): CallToolResult {
  const output = createLocateToolOutput(result);
  return {
    structuredContent: output as Readonly<Record<string, unknown>>,
    content: [{ type: 'text', text: JSON.stringify(output) }],
    isError: !output.ok,
  };
}
