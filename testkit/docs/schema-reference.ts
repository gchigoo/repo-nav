import {
  ANCHOR_KINDS,
  BACKEND_REASON_CODES,
  CANDIDATE_REASON_CODES,
  CONFIRMED_REASON_CODES,
  EVIDENCE_OPERATION_CODES,
  EVIDENCE_ROLES,
  EVIDENCE_SCHEMA_VERSION,
  EXCLUSION_REASON_CODES,
  LIMIT_REASON_CODES,
  LOCATE_STATUSES,
  NEXT_ACTION_CODES,
  PROMOTION_REQUIREMENT_CODES,
  REDACTION_REASON_CODES,
  REPO_LAYERS,
  TERM_CASE_MODES,
  TOOL_ERROR_CODES,
  createPublicErrorResult,
  LocateRequestSchema,
  LocateToolOutputSchema,
} from '../../src/contracts/index.js';
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
  const errorExample = LocateToolOutputSchema.parse(
    createPublicErrorResult('INVALID_INPUT', 'ADD_TERM'),
  );
  return {
    toolName: REPO_NAV_LOCATE_TOOL_NAME,
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
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
        statuses: LOCATE_STATUSES,
        roles: EVIDENCE_ROLES,
        confirmedReasons: CONFIRMED_REASON_CODES,
        candidateReasons: CANDIDATE_REASON_CODES,
        promotionRequirements: PROMOTION_REQUIREMENT_CODES,
        nextActions: NEXT_ACTION_CODES,
        operations: EVIDENCE_OPERATION_CODES,
        backendReasons: BACKEND_REASON_CODES,
        limitReasons: LIMIT_REASON_CODES,
        exclusionReasons: EXCLUSION_REASON_CODES,
        redactionReasons: REDACTION_REASON_CODES,
        toolErrors: TOOL_ERROR_CODES,
      },
      errorExample,
    },
  };
}
