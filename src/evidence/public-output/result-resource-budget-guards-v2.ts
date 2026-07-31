/**
 * ResultResourceBudgetGuardsV2 — dormant public-boundary resource budgets.
 * Depends on budget contract leaf; type-only imports for F1/F1A shapes.
 */

import {
  LOCATE_RESULT_RESOURCE_BUDGETS_V2,
  utf8ByteLengthV2,
} from '../../contracts/v2/locate-result-resource-budget-contract-v2.js';
import { guardCompactJsonDataV2 as guardCompactJsonDataCoreV2 } from '../../contracts/v2/compact-json-guard-v2.js';
import type { LocateResultV2 } from '../../contracts/v2/locate-result-v2.js';
import {
  BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
  PATH_PLACEHOLDER_V2,
  type PublicFieldKindV2,
  type PublicFieldRedactionV2,
  type SensitiveCorpusV2,
} from './sensitive-value-contract-v2.js';

export type ResourceBudgetStageV2 =
  | 'raw-shape'
  | 'raw-field'
  | 'raw-json'
  | 'corpus'
  | 'public-field'
  | 'public-json';

export type ResourceBudgetCheckV2 =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; stage: ResourceBudgetStageV2 }>;

const BUDGETS = LOCATE_RESULT_RESOURCE_BUDGETS_V2;
const OK: ResourceBudgetCheckV2 = Object.freeze({ ok: true });

function fail(stage: ResourceBudgetStageV2): ResourceBudgetCheckV2 {
  return Object.freeze({ ok: false, stage });
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
 * 实现下沉到 contracts leaf；此处保持 F1B 返回类型。
 */
export function guardCompactJsonDataV2(
  input: unknown,
  maxUtf8Bytes: number,
): ResourceBudgetCheckV2 {
  const result = guardCompactJsonDataCoreV2(input, maxUtf8Bytes);
  return result.ok ? OK : fail('raw-json');
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
  if (!isDataProperty(descriptor)) {
    return { ok: false };
  }
  return { ok: true, value: descriptor.value };
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

function guardRawStringField(value: unknown, maxUtf8Bytes: number): boolean {
  return typeof value === 'string' && utf8ByteLengthV2(value) <= maxUtf8Bytes;
}

function guardRawFileField(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  if (utf8ByteLengthV2(value) > BUDGETS.raw.maxFileUtf8Bytes) {
    return false;
  }
  const segments = value.split('/');
  return segments.length <= BUDGETS.raw.maxPathSegments;
}

function guardEvidenceLocationFields(location: unknown): boolean {
  if (typeof location !== 'object' || location === null) {
    return false;
  }
  const file = readOwnDataValue(location, 'file');
  if (!file.ok || !guardRawFileField(file.value)) {
    return false;
  }
  // Optional symbol may be absent; accessors/non-strings fail closed.
  let symbolDescriptor: PropertyDescriptor | undefined;
  try {
    symbolDescriptor = ownDataDescriptor(location, 'symbol');
  } catch {
    return false;
  }
  if (symbolDescriptor !== undefined) {
    if (!isDataProperty(symbolDescriptor)) {
      return false;
    }
    if (
      symbolDescriptor.value !== undefined &&
      !guardRawStringField(
        symbolDescriptor.value,
        BUDGETS.raw.maxSymbolUtf8Bytes,
      )
    ) {
      return false;
    }
  }
  const excerpt = readOwnDataValue(location, 'excerpt');
  if (
    !excerpt.ok ||
    !guardRawStringField(excerpt.value, BUDGETS.raw.maxExcerptUtf8Bytes)
  ) {
    return false;
  }
  return true;
}

function guardEvidenceArrayFields(
  items: unknown,
  maxItems: number,
): ResourceBudgetCheckV2 {
  const length = arrayLengthWithoutReadingElements(items);
  if (length === undefined) {
    return fail('raw-shape');
  }
  if (length > maxItems) {
    return fail('raw-shape');
  }
  if (!Array.isArray(items)) {
    return fail('raw-shape');
  }
  for (let index = 0; index < length; index += 1) {
    const itemRead = readOwnDataValue(items, String(index));
    if (
      !itemRead.ok ||
      typeof itemRead.value !== 'object' ||
      itemRead.value === null
    ) {
      return fail('raw-shape');
    }
    const location = readOwnDataValue(itemRead.value, 'location');
    if (!location.ok) {
      return fail('raw-shape');
    }
    if (!guardEvidenceLocationFields(location.value)) {
      return fail('raw-field');
    }
  }
  return OK;
}

function guardNormalizedTerms(terms: unknown): ResourceBudgetCheckV2 {
  const length = arrayLengthWithoutReadingElements(terms);
  if (length === undefined) {
    return fail('raw-shape');
  }
  if (length < 1 || length > BUDGETS.normalizedTerms.maxItems) {
    return fail('raw-shape');
  }
  if (!Array.isArray(terms)) {
    return fail('raw-shape');
  }
  let totalBytes = 0;
  for (let index = 0; index < length; index += 1) {
    const itemRead = readOwnDataValue(terms, String(index));
    if (
      !itemRead.ok ||
      typeof itemRead.value !== 'object' ||
      itemRead.value === null
    ) {
      return fail('raw-shape');
    }
    const valueRead = readOwnDataValue(itemRead.value, 'value');
    if (!valueRead.ok || typeof valueRead.value !== 'string') {
      return fail('raw-field');
    }
    const bytes = utf8ByteLengthV2(valueRead.value);
    if (bytes > BUDGETS.normalizedTerms.maxItemUtf8Bytes) {
      return fail('raw-field');
    }
    totalBytes += bytes;
    if (totalBytes > BUDGETS.normalizedTerms.maxTotalUtf8Bytes) {
      return fail('raw-field');
    }
  }
  return OK;
}

/**
 * Shallow count/type + raw field + 4 MiB source JSON preflight for dormant assembler.
 */
export function preflightUnsafePublicMaterializationSourceBudgetV2(
  input: unknown,
): ResourceBudgetCheckV2 {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail('raw-shape');
  }
  if (!isPlainRecord(input)) {
    return fail('raw-shape');
  }
  const okRead = readOwnDataValue(input, 'ok');
  if (!okRead.ok || typeof okRead.value !== 'boolean') {
    return fail('raw-shape');
  }
  if (okRead.value === false) {
    const compact = guardCompactJsonDataV2(input, BUDGETS.raw.maxJsonUtf8Bytes);
    return compact.ok ? OK : fail('raw-json');
  }

  const evidenceRead = readOwnDataValue(input, 'evidence');
  if (
    !evidenceRead.ok ||
    typeof evidenceRead.value !== 'object' ||
    evidenceRead.value === null ||
    Array.isArray(evidenceRead.value)
  ) {
    return fail('raw-shape');
  }
  const evidence = evidenceRead.value;
  const termsRead = readOwnDataValue(evidence, 'normalizedTerms');
  if (!termsRead.ok) {
    return fail('raw-shape');
  }
  const termsResult = guardNormalizedTerms(termsRead.value);
  if (!termsResult.ok) {
    return termsResult;
  }

  const confirmedRead = readOwnDataValue(evidence, 'confirmed');
  if (!confirmedRead.ok) {
    return fail('raw-shape');
  }
  const confirmedLength = arrayLengthWithoutReadingElements(
    confirmedRead.value,
  );
  if (
    confirmedLength === undefined ||
    confirmedLength > BUDGETS.evidence.maxConfirmed
  ) {
    return fail('raw-shape');
  }

  const candidatesRead = readOwnDataValue(evidence, 'candidates');
  if (!candidatesRead.ok) {
    return fail('raw-shape');
  }
  const candidatesLength = arrayLengthWithoutReadingElements(
    candidatesRead.value,
  );
  if (
    candidatesLength === undefined ||
    candidatesLength > BUDGETS.evidence.maxCandidates
  ) {
    return fail('raw-shape');
  }
  if (confirmedLength + candidatesLength > BUDGETS.evidence.maxTotal) {
    return fail('raw-shape');
  }

  const confirmedFields = guardEvidenceArrayFields(
    confirmedRead.value,
    BUDGETS.evidence.maxConfirmed,
  );
  if (!confirmedFields.ok) {
    return confirmedFields;
  }
  const candidateFields = guardEvidenceArrayFields(
    candidatesRead.value,
    BUDGETS.evidence.maxCandidates,
  );
  if (!candidateFields.ok) {
    return candidateFields;
  }

  const compact = guardCompactJsonDataV2(input, BUDGETS.raw.maxJsonUtf8Bytes);
  return compact.ok ? OK : fail('raw-json');
}

/**
 * Recompute expanded corpus entry count/bytes; require derived total match.
 */
export function guardSensitiveCorpusBudgetV2(
  corpus: SensitiveCorpusV2,
): ResourceBudgetCheckV2 {
  const entries = corpus.entries;
  const length = arrayLengthWithoutReadingElements(entries);
  if (length === undefined) {
    return fail('corpus');
  }
  if (length > BUDGETS.corpus.maxEntries) {
    return fail('corpus');
  }
  const derived = corpus.totalUtf8Bytes;
  if (
    typeof derived !== 'number' ||
    !Number.isSafeInteger(derived) ||
    derived < 0 ||
    !Number.isFinite(derived)
  ) {
    return fail('corpus');
  }

  let recomputed = 0;
  for (let index = 0; index < length; index += 1) {
    if (!Array.isArray(entries)) {
      return fail('corpus');
    }
    const entryRead = readOwnDataValue(entries as object, String(index));
    if (
      !entryRead.ok ||
      typeof entryRead.value !== 'object' ||
      entryRead.value === null
    ) {
      return fail('corpus');
    }
    const valueRead = readOwnDataValue(entryRead.value, 'value');
    if (!valueRead.ok || typeof valueRead.value !== 'string') {
      return fail('corpus');
    }
    const bytes = utf8ByteLengthV2(valueRead.value);
    if (
      bytes < BUDGETS.corpus.minEntryUtf8Bytes ||
      bytes > BUDGETS.corpus.maxEntryUtf8Bytes
    ) {
      return fail('corpus');
    }
    recomputed += bytes;
    if (recomputed > BUDGETS.corpus.maxTotalUtf8Bytes) {
      return fail('corpus');
    }
  }
  if (recomputed !== derived) {
    return fail('corpus');
  }
  return OK;
}

/**
 * Post-redaction public field UTF-8 budget; N+1 uses whole-field oversized placeholder.
 */
export function applyPublicFieldBudgetV2(
  field: PublicFieldKindV2,
  redaction: PublicFieldRedactionV2,
): PublicFieldRedactionV2 {
  const max =
    field === 'term'
      ? BUDGETS.public.maxTermUtf8Bytes
      : field === 'file'
        ? BUDGETS.public.maxFileUtf8Bytes
        : field === 'symbol'
          ? BUDGETS.public.maxSymbolUtf8Bytes
          : BUDGETS.public.maxExcerptUtf8Bytes;
  if (utf8ByteLengthV2(redaction.value) <= max) {
    return redaction;
  }
  return Object.freeze({
    value:
      field === 'file'
        ? PATH_PLACEHOLDER_V2
        : BINARY_OR_OVERSIZED_PLACEHOLDER_V2,
    reasonCodes: Object.freeze(['BINARY_OR_OVERSIZED_CONTENT'] as const),
  });
}

/**
 * Compact serialized public result JSON must stay within 1 MiB.
 */
export function guardSerializedPublicResultBudgetV2(
  result: LocateResultV2,
): ResourceBudgetCheckV2 {
  const state: CounterState = {
    bytes: 0,
    max: BUDGETS.public.maxJsonUtf8Bytes,
    stack: new Set<object>(),
  };
  if (!countCompactJsonData(result, state)) {
    return fail('public-json');
  }
  return OK;
}
