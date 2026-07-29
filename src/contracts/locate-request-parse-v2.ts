import { LOCATE_INPUT_MAX_BYTES, REPO_LAYERS } from './constants.js';
import { LocateRequestSchema, type LocateRequest } from './request.js';
import { guardCompactJsonDataV2 } from './v2/compact-json-guard-v2.js';

/**
 * F6 raw request guard + parse：生产 MCP/CLI 入口（不经 evidence/public-output）。
 */

const MAX_TERMS = 16;
const MAX_NEGATIVE_TERMS = 16;
const MAX_ANCHORS = 16;
const MAX_LAYERS = REPO_LAYERS.length;

function ownDataDescriptor(
  target: object,
  key: string,
): PropertyDescriptor | undefined {
  return Object.getOwnPropertyDescriptor(target, key);
}

function isDataProperty(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor {
  return (
    descriptor !== undefined &&
    Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
    typeof descriptor.get !== 'function' &&
    typeof descriptor.set !== 'function'
  );
}

function arrayLengthWithoutReadingElements(value: unknown): number | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  try {
    const descriptor = ownDataDescriptor(value, 'length');
    if (
      !isDataProperty(descriptor) ||
      typeof descriptor.value !== 'number' ||
      !Number.isSafeInteger(descriptor.value) ||
      descriptor.value < 0
    ) {
      return undefined;
    }
    return descriptor.value;
  } catch {
    return undefined;
  }
}

function readOwnDataValue(
  target: object,
  key: string,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = ownDataDescriptor(target, key);
  } catch {
    return { ok: false };
  }
  if (descriptor === undefined) {
    return { ok: true, value: undefined };
  }
  if (!isDataProperty(descriptor)) {
    return { ok: false };
  }
  return { ok: true, value: descriptor.value };
}

function assertArrayCountOrAbsent(
  root: object,
  key: string,
  maximum: number,
  minimum?: number,
): void {
  const read = readOwnDataValue(root, key);
  if (!read.ok) {
    throw new Error(`Locate input field ${key} is not a data property.`);
  }
  if (read.value === undefined) {
    return;
  }
  const length = arrayLengthWithoutReadingElements(read.value);
  if (length === undefined) {
    throw new Error(`Locate input field ${key} must be an array.`);
  }
  if (minimum !== undefined && length < minimum) {
    throw new Error(`Locate input field ${key} below minimum count.`);
  }
  if (length > maximum) {
    throw new Error(`Locate input field ${key} exceeds maximum count.`);
  }
}

/**
 * Zod/transform 前的 raw guard：count N+1 不读 element；随后 F1B compact JSON。
 */
export function guardLocateRequestRawV2(input: unknown): void {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Locate input must be a plain object.');
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error('Locate input prototype is not accepted.');
  }

  const repoPath = readOwnDataValue(input, 'repoPath');
  if (!repoPath.ok || typeof repoPath.value !== 'string') {
    throw new Error('Locate input repoPath must be a string data property.');
  }
  const terms = readOwnDataValue(input, 'terms');
  if (!terms.ok || terms.value === undefined) {
    throw new Error('Locate input terms is required.');
  }
  assertArrayCountOrAbsent(input, 'terms', MAX_TERMS, 1);
  assertArrayCountOrAbsent(input, 'negativeTerms', MAX_NEGATIVE_TERMS);
  assertArrayCountOrAbsent(input, 'anchors', MAX_ANCHORS);
  assertArrayCountOrAbsent(input, 'layers', MAX_LAYERS);

  const compact = guardCompactJsonDataV2(input, LOCATE_INPUT_MAX_BYTES);
  if (!compact.ok) {
    throw new Error(
      `Locate input exceeds ${String(LOCATE_INPUT_MAX_BYTES)} UTF-8 bytes.`,
    );
  }
}

export function parseLocateRequestV2(input: unknown): LocateRequest {
  guardLocateRequestRawV2(input);
  return LocateRequestSchema.parse(input);
}

export function safeParseLocateRequestV2(
  input: unknown,
):
  | { readonly success: true; readonly data: LocateRequest }
  | { readonly success: false; readonly error: Error } {
  try {
    return { success: true, data: parseLocateRequestV2(input) };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
