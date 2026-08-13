/** F9-REAL-MCP-001 confirmation schema fields (owner-supplied). */
export const REAL_CONSUMER_CONFIRMATION_REQUIRED_KEYS_V2 = Object.freeze([
  'schemaVersion',
  'candidate',
  'repository',
  'intent',
  'sensitiveOutputPolicy',
  'owner',
  'verified_at',
  'decisionSha256',
] as const);

/** Strict top-level and nested key sets; extras are unmeasured attestations. */
export const REAL_CONSUMER_CONFIRMATION_STRICT_KEYS_V2 = Object.freeze([
  ...REAL_CONSUMER_CONFIRMATION_REQUIRED_KEYS_V2,
] as const);

export const REAL_CONSUMER_CANDIDATE_STRICT_KEYS_V2 = Object.freeze([
  'name',
  'version',
  'tarballSha256',
] as const);

export const REAL_CONSUMER_REPOSITORY_STRICT_KEYS_V2 = Object.freeze([
  'canonicalRepositoryPath',
  'branch',
  'headSha',
] as const);

export const REAL_CONSUMER_INTENT_STRICT_KEYS_V2 = Object.freeze([
  'intentId',
  'requestSha256',
  'expectedSchemaVersion',
] as const);

export const REAL_CONSUMER_SENSITIVE_POLICY_V2 =
  'memory-only-v2-strict-forbidden-scan-no-persist' as const;

export const REAL_CONSUMER_RELEASE_OWNER_V2 = 'Gchigoo' as const;

export const REAL_CONSUMER_CONFIRMATION_PATH_V2 =
  'docs/superpowers/evidence/release-runtime/public-beta-real-consumer-confirmation.json' as const;

export const REAL_CONSUMER_OWNER_BLOCK_EXIT_V2 = 2 as const;
