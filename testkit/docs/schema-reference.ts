import {
  ANCHOR_KINDS,
  LocateRequestSchema,
  REPO_LAYERS,
  TERM_CASE_MODES,
} from '../../src/contracts/index.js';
import {
  LOCATE_STATUSES_V2,
  LocateResultV2Schema,
} from '../../src/contracts/v2/locate-result-v2.js';
import {
  REPO_NAV_LOCATE_INPUT_SCHEMA,
  REPO_NAV_LOCATE_OUTPUT_SCHEMA,
  REPO_NAV_LOCATE_TOOL_NAME,
} from '../../src/mcp/locate-tool-schema.js';

function objectRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as Readonly<Record<string, unknown>>;
}

function collectPropertyNames(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectPropertyNames(item, result);
    return result;
  }
  const record = objectRecord(value);
  const properties = objectRecord(record['properties']);
  for (const name of Object.keys(properties)) result.add(name);
  for (const nested of Object.values(record)) collectPropertyNames(nested, result);
  return result;
}

/**
 * Build the machine-readable API reference projection for docs smoke.
 */
export function buildSchemaReferenceProjection(): Readonly<Record<string, unknown>> {
  const inputProperties = Object.keys(
    objectRecord(objectRecord(REPO_NAV_LOCATE_INPUT_SCHEMA)['properties']),
  ).sort();
  const requiredRaw = objectRecord(REPO_NAV_LOCATE_INPUT_SCHEMA)['required'];
  const inputRequired = Array.isArray(requiredRaw)
    ? requiredRaw.filter((value): value is string => typeof value === 'string').sort()
    : [];
  const inputExample = LocateRequestSchema.parse({
    repoPath: '/workspace/repository',
    question: 'Where is the value mapping implemented?',
    terms: ['external_id', 'internalId'],
    anchors: [{ kind: 'symbol', value: 'mapIdentifier' }],
    layers: ['server'],
  });
  const errorExample = LocateResultV2Schema.parse({
    ok: false,
    error: {
      code: 'INVALID_INPUT',
      message: 'Locate request does not match the required schema.',
      recoverable: true,
      suggestedAction: 'ADD_TERM',
    },
  });
  return {
    toolName: REPO_NAV_LOCATE_TOOL_NAME,
    schemaVersion: '2.0',
    input: {
      fields: inputProperties,
      required: inputRequired,
      enums: {
        anchorKinds: ANCHOR_KINDS,
        layers: REPO_LAYERS,
        termCase: TERM_CASE_MODES,
      },
      example: inputExample,
    },
    output: {
      fields: [...collectPropertyNames(REPO_NAV_LOCATE_OUTPUT_SCHEMA)].sort(),
      enums: {
        statuses: LOCATE_STATUSES_V2,
        toolErrors: [
          'INVALID_INPUT',
          'INVALID_REPOSITORY',
          'PATH_OUTSIDE_ROOT',
          'INTERNAL_ERROR',
        ],
      },
      errorExample,
    },
  };
}
