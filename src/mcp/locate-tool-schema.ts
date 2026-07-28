import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import {
  LocateRequestSchema,
  LocateToolOutputSchema,
} from '../contracts/index.js';

export const REPO_NAV_LOCATE_TOOL_NAME = 'repo_nav_locate' as const;

type McpInputSchema = Tool['inputSchema'];
type McpOutputSchema = NonNullable<Tool['outputSchema']>;

type JsonSchemaObject = Readonly<Record<string, unknown>>;

function expectSchemaObject(value: unknown, path: string): JsonSchemaObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`RepoNav generated an invalid schema object at ${path}.`);
  }
  return value as JsonSchemaObject;
}

function describeRuntimeString(
  schema: unknown,
  label: string,
  maximumUtf8Bytes: number,
  mode: 'semantic' | 'filesystem' = 'semantic',
): JsonSchemaObject {
  const description =
    mode === 'filesystem'
      ? `${label} is a raw filesystem string preserved without NFKC/trim; ` +
        `runtime validation rejects NUL and values over ${maximumUtf8Bytes} UTF-8 bytes.`
      : `${label} must remain non-empty after NFKC normalization and trimming; ` +
        `runtime validation limits it to ${maximumUtf8Bytes} UTF-8 bytes.`;
  return {
    ...expectSchemaObject(schema, label),
    minLength: 1,
    description,
  };
}

function addLocateRuntimeConstraintAnnotations(
  schema: JsonSchemaObject,
): JsonSchemaObject {
  const properties = expectSchemaObject(schema.properties, 'properties');
  const terms = expectSchemaObject(properties.terms, 'properties.terms');
  const negativeTerms = expectSchemaObject(
    properties.negativeTerms,
    'properties.negativeTerms',
  );
  const anchors = expectSchemaObject(properties.anchors, 'properties.anchors');
  const anchorItems = expectSchemaObject(
    anchors.items,
    'properties.anchors.items',
  );
  const anchorProperties = expectSchemaObject(
    anchorItems.properties,
    'properties.anchors.items.properties',
  );

  return {
    ...schema,
    $comment:
      'Runtime Zod validation additionally enforces a serialized input UTF-8 byte budget and cross-field refinements.',
    properties: {
      ...properties,
      repoPath: describeRuntimeString(
        properties.repoPath,
        'repoPath',
        4096,
        'filesystem',
      ),
      question: {
        ...describeRuntimeString(properties.question, 'question', 4096),
        description:
          'Optional display-only question; when present must remain non-empty after NFKC/trim ' +
          '(max 4096 UTF-8 bytes). Omitted question does not affect search plan.',
      },
      terms: {
        ...terms,
        $comment:
          'Runtime validation limits all normalized positive terms to 1024 UTF-8 bytes in total.',
        items: describeRuntimeString(terms.items, 'search term', 128),
      },
      negativeTerms: {
        ...negativeTerms,
        $comment:
          'Runtime validation limits all normalized negative terms to 1024 UTF-8 bytes in total.',
        items: describeRuntimeString(
          negativeTerms.items,
          'negative search term',
          128,
        ),
      },
      anchors: {
        ...anchors,
        items: {
          ...anchorItems,
          $comment:
            'Runtime validation rejects file-anchor backslashes, absolute paths, and repository escape; file values are preserved exactly.',
          properties: {
            ...anchorProperties,
            value: describeRuntimeString(
              anchorProperties.value,
              'anchor value',
              512,
            ),
          },
        },
      },
    },
  };
}

const UNIQUE_OUTPUT_ARRAY_PROPERTIES = new Set([
  'discoveredBy',
  'operations',
  'promotionRequirements',
  'reasonCodes',
]);

function addOutputRepresentableConstraints(
  value: unknown,
  propertyName?: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => addOutputRepresentableConstraints(item));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const schema = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      addOutputRepresentableConstraints(item, key),
    ]),
  );
  if (Array.isArray(schema.prefixItems)) {
    const arity = schema.prefixItems.length;
    return {
      ...schema,
      minItems: arity,
      maxItems: arity,
      $comment:
        'Runtime Zod validation additionally requires the first line number to be less than or equal to the second.',
    };
  }
  if (
    schema.type === 'array' &&
    propertyName !== undefined &&
    UNIQUE_OUTPUT_ARRAY_PROPERTIES.has(propertyName)
  ) {
    return { ...schema, uniqueItems: true };
  }
  return schema;
}

function addLocateOutputConstraintAnnotations(
  schema: JsonSchemaObject,
): JsonSchemaObject {
  return {
    ...expectSchemaObject(
      addOutputRepresentableConstraints(schema),
      'output schema',
    ),
    $comment:
      'Runtime Zod validation additionally enforces cross-collection evidence ID and other custom refinements.',
  };
}

function toMcpObjectSchema(
  schema: z.ZodType,
  io: 'input' | 'output',
): McpInputSchema | McpOutputSchema {
  const generatedSchema = z.toJSONSchema(schema, {
    io,
    target: 'draft-2020-12',
  });
  if (typeof generatedSchema === 'boolean') {
    throw new Error('RepoNav tool schema must be a JSON object schema.');
  }
  const jsonSchema =
    io === 'input'
      ? addLocateRuntimeConstraintAnnotations(generatedSchema)
      : addLocateOutputConstraintAnnotations(generatedSchema);
  return {
    ...jsonSchema,
    type: 'object',
  } as McpInputSchema | McpOutputSchema;
}

export const REPO_NAV_LOCATE_INPUT_SCHEMA = Object.freeze(
  toMcpObjectSchema(LocateRequestSchema, 'input') as McpInputSchema,
);

export const REPO_NAV_LOCATE_OUTPUT_SCHEMA = Object.freeze(
  toMcpObjectSchema(LocateToolOutputSchema, 'output') as McpOutputSchema,
);

export const REPO_NAV_LOCATE_TOOL: Tool = Object.freeze({
  name: REPO_NAV_LOCATE_TOOL_NAME,
  title: 'Locate repository evidence',
  description:
    'Locate current, filesystem-verified source-of-truth evidence in a repository.',
  inputSchema: REPO_NAV_LOCATE_INPUT_SCHEMA,
  outputSchema: REPO_NAV_LOCATE_OUTPUT_SCHEMA,
  annotations: Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  }),
});
