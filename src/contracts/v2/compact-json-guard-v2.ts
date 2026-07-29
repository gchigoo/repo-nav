/**
 * Compact JSON UTF-8 byte guard（F1B internal ABI leaf；F6 raw request 复用）。
 * 仅依赖 budget contract，不依赖 locate-result / public-output。
 */

import { utf8ByteLengthV2 } from './locate-result-resource-budget-contract-v2.js';

export type CompactJsonBudgetCheckV2 =
  Readonly<{ ok: true }> | Readonly<{ ok: false; stage: 'raw-json' }>;

const OK: CompactJsonBudgetCheckV2 = Object.freeze({ ok: true });

function fail(): CompactJsonBudgetCheckV2 {
  return Object.freeze({ ok: false, stage: 'raw-json' as const });
}

function isPlainRecord(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function ownDataDescriptor(
  target: object,
  key: string | symbol,
): PropertyDescriptor | undefined {
  return Object.getOwnPropertyDescriptor(target, key);
}

function isDataProperty(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & {
  readonly value: unknown;
  get?: undefined;
  set?: undefined;
} {
  return (
    descriptor !== undefined &&
    !('get' in descriptor && descriptor.get !== undefined) &&
    !('set' in descriptor && descriptor.set !== undefined) &&
    'value' in descriptor
  );
}

type CounterState = {
  bytes: number;
  readonly max: number;
  /** Path stack for true cycle detection; DAG sharing remains valid. */
  readonly stack: Set<object>;
};

function addBytes(state: CounterState, amount: number): boolean {
  state.bytes += amount;
  return state.bytes <= state.max;
}

/**
 * Exact compact-JSON UTF-8 byte contribution of a string literal,
 * matching JSON.stringify escaping (including lone surrogates as \\u + 4 hex).
 */
function addJsonStringBytes(state: CounterState, value: string): boolean {
  if (!addBytes(state, 2)) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x22 || code === 0x5c) {
      // " or \
      if (!addBytes(state, 2)) {
        return false;
      }
      continue;
    }
    if (code === 0x08) {
      if (!addBytes(state, 2)) {
        return false;
      }
      continue;
    }
    if (code === 0x0c) {
      if (!addBytes(state, 2)) {
        return false;
      }
      continue;
    }
    if (code === 0x0a) {
      if (!addBytes(state, 2)) {
        return false;
      }
      continue;
    }
    if (code === 0x0d) {
      if (!addBytes(state, 2)) {
        return false;
      }
      continue;
    }
    if (code === 0x09) {
      if (!addBytes(state, 2)) {
        return false;
      }
      continue;
    }
    if (code < 0x20) {
      // control char → \\u + 4 hex digits (6 code units)
      if (!addBytes(state, 6)) {
        return false;
      }
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const codePoint = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        const utf8 =
          codePoint <= 0x7f
            ? 1
            : codePoint <= 0x7ff
              ? 2
              : codePoint <= 0xffff
                ? 3
                : 4;
        if (!addBytes(state, utf8)) {
          return false;
        }
        index += 1;
        continue;
      }
      // lone high surrogate
      if (!addBytes(state, 6)) {
        return false;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      // lone low surrogate
      if (!addBytes(state, 6)) {
        return false;
      }
      continue;
    }
    const utf8 = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : 3;
    if (!addBytes(state, utf8)) {
      return false;
    }
  }
  return true;
}

function addJsonNumberBytes(state: CounterState, value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }
  const text = Object.is(value, -0) ? '0' : String(value);
  return addBytes(state, utf8ByteLengthV2(text));
}

function countCompactJsonData(value: unknown, state: CounterState): boolean {
  if (value === null) {
    return addBytes(state, 4);
  }
  if (typeof value === 'boolean') {
    return addBytes(state, value ? 4 : 5);
  }
  if (typeof value === 'number') {
    return addJsonNumberBytes(state, value);
  }
  if (typeof value === 'string') {
    return addJsonStringBytes(state, value);
  }
  if (typeof value !== 'object') {
    return false;
  }
  if (state.stack.has(value)) {
    return false;
  }
  state.stack.add(value);
  const ok = Array.isArray(value)
    ? countArray(value, state)
    : countRecord(value, state);
  state.stack.delete(value);
  return ok;
}

function countArray(value: unknown[], state: CounterState): boolean {
  let length: number;
  try {
    const lengthDescriptor = ownDataDescriptor(value, 'length');
    if (
      !isDataProperty(lengthDescriptor) ||
      typeof lengthDescriptor.value !== 'number' ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      lengthDescriptor.enumerable === true
    ) {
      return false;
    }
    length = lengthDescriptor.value;
  } catch {
    return false;
  }

  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (key === 'length') {
      continue;
    }
    if (typeof key === 'symbol') {
      return false;
    }
    const index = Number(key);
    if (
      !Number.isInteger(index) ||
      String(index) !== key ||
      index < 0 ||
      index >= length
    ) {
      return false;
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = ownDataDescriptor(value, key);
    } catch {
      return false;
    }
    if (
      !isDataProperty(descriptor) ||
      descriptor.enumerable !== true ||
      descriptor.value === undefined
    ) {
      return false;
    }
  }

  if (!addBytes(state, 1)) {
    return false;
  }
  for (let index = 0; index < length; index += 1) {
    if (index > 0 && !addBytes(state, 1)) {
      return false;
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = ownDataDescriptor(value, String(index));
    } catch {
      return false;
    }
    if (
      !isDataProperty(descriptor) ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(value, String(index)) ||
      descriptor.value === undefined
    ) {
      return false;
    }
    if (!countCompactJsonData(descriptor.value, state)) {
      return false;
    }
  }
  return addBytes(state, 1);
}

function countRecord(value: object, state: CounterState): boolean {
  if (!isPlainRecord(value)) {
    return false;
  }
  if (
    Object.prototype.hasOwnProperty.call(value, 'toJSON') ||
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  ) {
    return false;
  }

  let keys: string[];
  try {
    keys = Object.keys(value);
  } catch {
    return false;
  }

  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key === 'symbol') {
      return false;
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = ownDataDescriptor(value, key);
    } catch {
      return false;
    }
    if (
      !isDataProperty(descriptor) ||
      descriptor.enumerable !== true ||
      descriptor.value === undefined
    ) {
      return false;
    }
  }

  if (!addBytes(state, 1)) {
    return false;
  }
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    if (index > 0 && !addBytes(state, 1)) {
      return false;
    }
    if (!addJsonStringBytes(state, key)) {
      return false;
    }
    if (!addBytes(state, 1)) {
      return false;
    }
    const descriptor = ownDataDescriptor(value, key);
    if (!isDataProperty(descriptor) || descriptor.value === undefined) {
      return false;
    }
    if (!countCompactJsonData(descriptor.value, state)) {
      return false;
    }
  }
  return addBytes(state, 1);
}

/**
 * Parameterized abort-at-N+1 compact JSON UTF-8 guard (internal forward ABI).
 * Callers only observe pass/fail stage; counter state is private.
 */
export function guardCompactJsonDataV2(
  input: unknown,
  maxUtf8Bytes: number,
): CompactJsonBudgetCheckV2 {
  if (
    typeof maxUtf8Bytes !== 'number' ||
    !Number.isSafeInteger(maxUtf8Bytes) ||
    maxUtf8Bytes <= 0
  ) {
    return fail();
  }
  if (input === undefined) {
    return fail();
  }
  const state: CounterState = {
    bytes: 0,
    max: maxUtf8Bytes,
    stack: new Set<object>(),
  };
  if (!countCompactJsonData(input, state)) {
    return fail();
  }
  return OK;
}
