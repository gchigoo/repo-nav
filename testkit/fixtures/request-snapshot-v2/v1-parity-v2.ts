/**
 * F3-V1-001：无 mutation 时启用 snapshot 的 v1 deep-exact 覆盖清单。
 * 引用既有 Golden manifests，禁止 boolean marker 冒充 fixture。
 */
export const V1_PARITY_GOLDEN_CASE_IDS_V2 = Object.freeze([
  'text-engine-baseline',
  'ripgrep-incomplete',
  'ripgrep-unavailable',
] as const);

export type V1ParityGoldenCaseIdV2 =
  (typeof V1_PARITY_GOLDEN_CASE_IDS_V2)[number];

/** 额外 no_result：同 fixture、空 hits、strategy complete。 */
export const V1_PARITY_NO_RESULT_REQUEST_V2 = Object.freeze({
  repoPath: 'testkit/fixtures/text-engine',
  question: 'Where is an absent mapping?',
  terms: ['__repo_nav_absent_term__'],
  termCase: 'insensitive' as const,
  layers: Object.freeze(['server'] as const),
});
