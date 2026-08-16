import {
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import { serializeLocateAgentViewV2 } from '../../../src/mcp/locate-agent-view-v2.js';

export interface SyntheticLocateProjectionV2 {
  readonly service: LocateResultV2;
  readonly structuredContent: LocateResultV2;
  readonly text: string;
  readonly debugLocateStdout: string;
  readonly isError: boolean;
}

export function projectSyntheticLocateResultV2(
  result: LocateResultV2,
  request?: unknown,
): SyntheticLocateProjectionV2 {
  const parsed = LocateResultV2Schema.parse(result);
  const serialized = JSON.stringify(parsed);
  return Object.freeze({
    service: parsed,
    structuredContent: parsed,
    text: serializeLocateAgentViewV2(parsed, request),
    debugLocateStdout: serialized,
    isError: !parsed.ok,
  });
}
