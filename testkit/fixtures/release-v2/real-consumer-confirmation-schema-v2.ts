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

export const REAL_CONSUMER_SENSITIVE_POLICY_V2 =
  'memory-only-v2-strict-forbidden-scan-no-persist' as const;

export const REAL_CONSUMER_CONFIRMATION_PATH_V2 =
  'docs/superpowers/evidence/release-runtime/public-beta-real-consumer-confirmation.json' as const;

export const REAL_CONSUMER_OWNER_BLOCK_EXIT_V2 = 2 as const;
