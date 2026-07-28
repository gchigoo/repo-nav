/**
 * F1B-PUBLIC-JSON-001 fixtures for serialized 1 MiB guard.
 */

import { LOCATE_RESULT_RESOURCE_BUDGETS_V2 } from '../../../src/contracts/v2/locate-result-resource-budget-contract-v2.js';
import type { LocateResultV2 } from '../../../src/contracts/v2/locate-result-v2.js';
import { utf8Repeat } from './resource-budgets-v2.js';

export const PUBLIC_JSON_MAX =
  LOCATE_RESULT_RESOURCE_BUDGETS_V2.public.maxJsonUtf8Bytes;

/** Compact JSON value sized to exact UTF-8 byte length via a string field. */
export function compactJsonValueOfBytes(targetBytes: number): unknown {
  // {"v":"<payload>"} => 8 + payload utf8 (ASCII, no escapes)
  const overhead = Buffer.byteLength(JSON.stringify({ v: '' }), 'utf8');
  const payload = utf8Repeat('x', Math.max(0, targetBytes - overhead));
  const value = { v: payload };
  const actual = Buffer.byteLength(JSON.stringify(value), 'utf8');
  if (actual !== targetBytes) {
    throw new Error(
      `compactJsonValueOfBytes: wanted ${String(targetBytes)}, got ${String(actual)}`,
    );
  }
  return value;
}

export function tinyPublicErrorResult(): LocateResultV2 {
  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Repository evidence request failed.',
      recoverable: false,
    },
  };
}
