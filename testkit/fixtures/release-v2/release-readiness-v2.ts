/** F9-RELEASE-001 */
export const RELEASE_READINESS_PRIVATE_V2 = false as const;
export const RELEASE_READINESS_PUBLISH_V2 = false as const;
export const RELEASE_FORBIDDEN_SCRIPT_TOKENS_V2 = Object.freeze([
  'npm publish',
  'git push',
  'gh release',
] as const);
