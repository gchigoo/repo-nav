/**
 * F9 / public package root — v2 request/result + stable client API.
 * Legacy v1 contracts: `repo-nav/legacy-v1`.
 * Backend adapters: `repo-nav/backends`.
 * Node adapters: `repo-nav/node`.
 * DI tokens / planners: `repo-nav/advanced`.
 */

export * from './contracts/v2/locate-result-v2.js';
export {
  parseLocateRequestV2,
  safeParseLocateRequestV2,
  guardLocateRequestRawV2,
} from './contracts/locate-request-parse-v2.js';
export type { LocateRequest } from './contracts/request.js';
export { createRepoNavApplicationContext } from './app/create-application-context.js';
export { readPackageMetadata } from './runtime/package-metadata.js';
export type {
  PackageMetadata,
  PackageMetadataV1,
} from './runtime/package-metadata.js';

/** @deprecated Import from `repo-nav/advanced`. */
export {
  REPOSITORY_EVIDENCE_SERVICE,
  REPOSITORY_SEARCH_BACKENDS,
  REPOSITORY_READER,
  MCP_STDIO_HOST,
} from './runtime/tokens.js';
/** @deprecated Import from `repo-nav/node`. */
export { NodeRepositoryReader } from './repository/node-repository-reader.js';
/** @deprecated Import from `repo-nav/backends`. */
export { RipgrepBackend } from './repository/ripgrep-backend.js';
/** @deprecated Import from `repo-nav/backends`. */
export { CodeGraphBackend } from './repository/codegraph-backend.js';
/** @deprecated Import from `repo-nav/advanced`. */
export * from './repository/codegraph-command.js';
/** @deprecated Import from `repo-nav/advanced`. */
export * from './repository/codegraph-json.js';
/** @deprecated Import from `repo-nav/advanced`. */
export * from './repository/codegraph-query-planner.js';
/** @deprecated Import from `repo-nav/node`. */
export { NodeSafeProcessRunner } from './repository/node-safe-process-runner.js';
