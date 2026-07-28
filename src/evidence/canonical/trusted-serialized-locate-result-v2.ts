/**
 * Capability-bound success and fixed-safe-error trusted serialization seam.
 */

import {
  LocateResultV2Schema,
  type LocateResultV2,
  type RepoNavToolErrorV2,
} from '../../contracts/v2/locate-result-v2.js';
import type { LocateProjectionExecutionCapabilityV2 } from '../../contracts/v2/locate-fact-envelope-v2.js';
import { guardSerializedPublicResultBudgetV2 } from '../public-output/result-resource-budget-guards-v2.js';
import { requireTrustedMaterializedLocateResultV2 } from './materialized-locate-result-composer-v2.js';
import type { TrustedMaterializedLocateResultV2 } from './materialized-locate-result-composer-v2.js';

declare const TRUSTED_SCHEMA_VALIDATED_LOCATE_RESULT_V2: unique symbol;
export type TrustedSchemaValidatedLocateResultV2 = Readonly<{
  readonly [TRUSTED_SCHEMA_VALIDATED_LOCATE_RESULT_V2]: never;
}>;

declare const TRUSTED_SERIALIZED_LOCATE_RESULT_V2: unique symbol;
export type TrustedSerializedLocateResultV2 = Readonly<{
  readonly [TRUSTED_SERIALIZED_LOCATE_RESULT_V2]: never;
}>;

interface TrustedSerializedLocateResultViewV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
}

interface SchemaRegistryEntryV2 {
  readonly value: LocateResultV2;
}

interface SerializedRegistryEntryV2 {
  readonly value: LocateResultV2;
  readonly compactJson: string;
  readonly utf8Bytes: number;
  readonly capability: LocateProjectionExecutionCapabilityV2;
}

const schemaRegistry = new WeakMap<
  TrustedSchemaValidatedLocateResultV2,
  SchemaRegistryEntryV2
>();
const serializedRegistry = new WeakMap<
  TrustedSerializedLocateResultV2,
  SerializedRegistryEntryV2
>();

function createOpaqueBrand(): object {
  return Object.freeze(Object.create(null) as object);
}

type PublicToolErrorCodeV2 = RepoNavToolErrorV2['code'];

function createSafeErrorV2(
  code: PublicToolErrorCodeV2,
  suggestedAction?: 'ADD_TERM',
): LocateResultV2 {
  switch (code) {
    case 'INVALID_INPUT':
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code,
          message: 'Locate request does not match the required schema.',
          recoverable: true,
          ...(suggestedAction === undefined ? {} : { suggestedAction }),
        }),
      });
    case 'INVALID_REPOSITORY':
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code,
          message: 'Repository root is invalid or unavailable.',
          recoverable: true,
        }),
      });
    case 'PATH_OUTSIDE_ROOT':
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code,
          message: 'Repository path is outside the configured root.',
          recoverable: false,
        }),
      });
    case 'INTERNAL_ERROR':
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code,
          message: 'Repository evidence request failed.',
          recoverable: false,
        }),
      });
  }
}

/**
 * Validate composed trusted materialization against public strict schema.
 */
export function validateComposedLocateResultV2ForSerialization(
  value: TrustedMaterializedLocateResultV2,
): TrustedSchemaValidatedLocateResultV2 {
  const composed = requireTrustedMaterializedLocateResultV2(value);
  const parsed = LocateResultV2Schema.safeParse(composed);
  if (!parsed.success) {
    throw new Error('Composed locate result failed public strict schema.');
  }
  const token = createOpaqueBrand() as TrustedSchemaValidatedLocateResultV2;
  schemaRegistry.set(token, Object.freeze({ value: parsed.data }));
  return token;
}

/**
 * Serialize schema-validated success under F1B 1 MiB guard, bound to capability.
 */
export function serializeTrustedMaterializedLocateResultV2(
  value: TrustedSchemaValidatedLocateResultV2,
  execution: LocateProjectionExecutionCapabilityV2,
): TrustedSerializedLocateResultV2 {
  const entry = schemaRegistry.get(value);
  if (entry === undefined) {
    throw new Error('Schema-validated locate result is not bound.');
  }
  const budget = guardSerializedPublicResultBudgetV2(entry.value);
  if (!budget.ok) {
    throw new Error('Serialized locate result exceeded public budget.');
  }
  const compactJson = JSON.stringify(entry.value);
  const utf8Bytes = Buffer.byteLength(compactJson, 'utf8');
  const token = createOpaqueBrand() as TrustedSerializedLocateResultV2;
  serializedRegistry.set(
    token,
    Object.freeze({
      value: entry.value,
      compactJson,
      utf8Bytes,
      capability: execution,
    }),
  );
  return token;
}

/**
 * Fixed-safe public tool error serializer; only four codes; ADD_TERM only with INVALID_INPUT.
 */
export function createTrustedSerializedPublicToolErrorV2(
  code: PublicToolErrorCodeV2,
  suggestedAction: 'ADD_TERM' | undefined,
  execution: LocateProjectionExecutionCapabilityV2,
): TrustedSerializedLocateResultV2 {
  if (
    suggestedAction !== undefined &&
    (suggestedAction !== 'ADD_TERM' || code !== 'INVALID_INPUT')
  ) {
    throw new Error('Invalid public tool error code/action combination.');
  }
  const approvedCodes: readonly PublicToolErrorCodeV2[] = [
    'INVALID_INPUT',
    'INVALID_REPOSITORY',
    'PATH_OUTSIDE_ROOT',
    'INTERNAL_ERROR',
  ];
  if (!approvedCodes.includes(code)) {
    throw new Error('Unsupported public tool error code.');
  }
  const errorResult = LocateResultV2Schema.parse(
    createSafeErrorV2(code, suggestedAction),
  );
  const budget = guardSerializedPublicResultBudgetV2(errorResult);
  if (!budget.ok) {
    throw new Error('Serialized error result exceeded public budget.');
  }
  const compactJson = JSON.stringify(errorResult);
  const utf8Bytes = Buffer.byteLength(compactJson, 'utf8');
  const token = createOpaqueBrand() as TrustedSerializedLocateResultV2;
  serializedRegistry.set(
    token,
    Object.freeze({
      value: errorResult,
      compactJson,
      utf8Bytes,
      capability: execution,
    }),
  );
  return token;
}

/**
 * Common accessor: expose value/JSON/bytes only for same capability exact match.
 */
export function requireTrustedSerializedLocateResultV2(
  serialized: TrustedSerializedLocateResultV2,
  expectedExecution: LocateProjectionExecutionCapabilityV2,
): TrustedSerializedLocateResultViewV2 {
  const entry = serializedRegistry.get(serialized);
  if (entry === undefined || entry.capability !== expectedExecution) {
    throw new Error('Trusted serialized locate result capability mismatch.');
  }
  return Object.freeze({
    value: entry.value,
    compactJson: entry.compactJson,
    utf8Bytes: entry.utf8Bytes,
  });
}
