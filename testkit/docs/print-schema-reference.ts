import { buildSchemaReferenceProjection } from './schema-reference.js';

process.stdout.write(
  `${JSON.stringify(buildSchemaReferenceProjection(), null, 2)}\n`,
);
