import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import { createStableGoldenProjection } from '../../contracts/golden-projection.js';
export {
  DEADLINE_CHARACTERIZATION_RESULT_V2,
  LOCATION_REDACTION_CHARACTERIZATION_RESULT_V2,
  OUTPUT_LIMIT_CHARACTERIZATION_RESULT_V2,
  SAFE_ERROR_CHARACTERIZATION_ROWS_V2,
  UPSTREAM_EXPANDED_HIT_CHARACTERIZATION_RESULT_V2,
} from './production-characterization-v2.js';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const expectedRoot = resolve(repositoryRoot, 'testkit', 'expected');
const HEX64 = /^[0-9a-f]{64}$/u;

export const LOCATE_EXECUTION_CHARACTERIZATION_FAMILIES_V2 = Object.freeze([
  'complete-hit',
  'complete-no-hit',
  'codegraph-unavailable-fallback',
  'codegraph-incomplete-fallback',
  'verified-primary-skip',
  'both-backends-unavailable',
  'output-limit',
  'caller-abort',
  'deadline-abort',
  'snapshot-mutation',
  'unsupported-language',
  'location-redaction',
  'safe-errors',
  'evidence-ids',
  'backend-order',
  'upstream-1.1.0-expanded-hit',
] as const);

export type LocateExecutionCharacterizationFamilyV2 =
  (typeof LOCATE_EXECUTION_CHARACTERIZATION_FAMILIES_V2)[number];

export interface GoldenCompanionCharacterizationRowV2 {
  readonly family: LocateExecutionCharacterizationFamilyV2;
  readonly source: 'golden-companion';
  readonly caseId: string;
  readonly ownerFile: string;
  readonly semanticSha256: string;
}

export const LOCATE_EXECUTION_GOLDEN_CHARACTERIZATION_ROWS_V2 = Object.freeze([
  Object.freeze({
    family: 'complete-hit',
    source: 'golden-companion',
    caseId: 'codegraph-symbol-complete-no-fallback',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '3d274783db4c7739622ea4e3bbfdcfc0ae5d16fcbefdebf2a1276e5b07f0f012',
  }),
  Object.freeze({
    family: 'complete-no-hit',
    source: 'golden-companion',
    caseId: 'codegraph-no-result',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '6d31b3e2fefb73cd5a58aa69f5bee34b346aca1a8e747f0bb257923646026b88',
  }),
  Object.freeze({
    family: 'codegraph-unavailable-fallback',
    source: 'golden-companion',
    caseId: 'codegraph-missing',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '091e68efa995c6ee204ea38cf2440b3787f10cb5ffddba460431f7b38fa6e8b4',
  }),
  Object.freeze({
    family: 'codegraph-incomplete-fallback',
    source: 'golden-companion',
    caseId: 'codegraph-incomplete',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '0220c3de1d1abab8609538657784d08e46e3dcc1e2d1a7c1597e2319127ddf30',
  }),
  Object.freeze({
    family: 'verified-primary-skip',
    source: 'golden-companion',
    caseId: 'codegraph-symbol-complete-no-fallback',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '3d274783db4c7739622ea4e3bbfdcfc0ae5d16fcbefdebf2a1276e5b07f0f012',
  }),
  Object.freeze({
    family: 'both-backends-unavailable',
    source: 'golden-companion',
    caseId: 'backend-unavailable',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '911b3261ce977463c04d358ab79ee3cc99b0fd9ba3f69f55c8a2b57afceaa015',
  }),
  Object.freeze({
    family: 'caller-abort',
    source: 'golden-companion',
    caseId: 'codegraph-global-abort-no-fallback',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      'ff8494fd89a2238b34e8b8e9abb8882c22ec5b797cd51e7da3588d7bac9dc017',
  }),
  Object.freeze({
    family: 'unsupported-language',
    source: 'golden-companion',
    caseId: 'ripgrep-incomplete',
    ownerFile: 'test/golden/text-evidence-engine.spec.ts',
    semanticSha256:
      '7d1f1f5f8fb9a44786618d665e9bcd555bde36d6642b5969ff3ad96e3e83385d',
  }),
  Object.freeze({
    family: 'evidence-ids',
    source: 'golden-companion',
    caseId: 'codegraph-secondary-provenance-table',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      'b03de1577870ecbc6d02b888980c5ede6c0be66f7ff41c9804a2463f8cb8f1f7',
  }),
  Object.freeze({
    family: 'backend-order',
    source: 'golden-companion',
    caseId: 'codegraph-incomplete',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '0220c3de1d1abab8609538657784d08e46e3dcc1e2d1a7c1597e2319127ddf30',
  }),
] as const satisfies readonly GoldenCompanionCharacterizationRowV2[]);

export const LOCATE_EXECUTION_COMPANION_SEMANTIC_SHA256_V2 = Object.freeze(
  Object.fromEntries(
    LOCATE_EXECUTION_GOLDEN_CHARACTERIZATION_ROWS_V2.map((row) => [
      row.caseId,
      row.semanticSha256,
    ]),
  ),
);

export function locateExecutionSemanticSha256V2(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function readGoldenCompanionResultV2(caseId: string): LocateResultV2 {
  const parsed: unknown = JSON.parse(
    readFileSync(resolve(expectedRoot, `${caseId}.json`), 'utf8'),
  );
  return LocateResultV2Schema.parse(parsed);
}

export function compareGoldenCompanionCharacterizationV2(
  row: GoldenCompanionCharacterizationRowV2,
): boolean {
  return (
    locateExecutionSemanticSha256V2(readGoldenCompanionResultV2(row.caseId)) ===
    row.semanticSha256
  );
}

export const LOCATE_EXECUTION_INLINE_SEMANTIC_SHA256_V2 = Object.freeze({
  outputLimit:
    'f2a1adade78d7c9d03bc8d33bd6eb6b77249191b5eb46569bfc09f99b3c7d679',
  deadlineAbort:
    '842d3837e2383f385c8dc33d581000601d4a707d1484f8e1d8460d79f0652b2f',
  locationRedaction:
    '3053e6d8334249a820936fb0d7b98cb16d16800e841ded433d8ae878092f5d2b',
  upstreamExpandedHit:
    '1d722b2f3bc1dbe83b6923ea6846f4affd8e711082279a5d5b5d02500f1bb0f8',
  safeErrors: Object.freeze({
    'invalid-input':
      '41ff7ef3127df04e61cc8e1990f67a70eee26d5c8272d44910972d2e03608446',
    'invalid-repository':
      'd398794b90bc20c0c64a4021af35181239dade28ab1fb8ef121cd021f8a71625',
    'path-outside-root':
      '52c8b47d3d2462eacd7c9817882cc47d61d4f8fd114f9f55db584438a010a300',
    'internal-error':
      '01e433b7c491ac574de8acb68232dfd59a06f54bd46185f4508af54ed645a3d9',
  }),
  snapshotMutation:
    '1f2863f7bdb4fc482d9df12668773f4419bad008424c3e2f5c2da6afaba7c436',
});

export const SNAPSHOT_MUTATION_CHARACTERIZATION_RESULT_V2 = Object.freeze({
  ok: true as const,
  evidence: Object.freeze({
    schemaVersion: '2.0' as const,
    status: 'partial' as const,
    repositoryRef: 'local-repository' as const,
    normalizedTerms: Object.freeze([
      Object.freeze({ value: 'changedId', caseSensitive: true }),
      Object.freeze({ value: 'stableId', caseSensitive: true }),
      Object.freeze({ value: 'row.changed_id', caseSensitive: true }),
      Object.freeze({ value: 'row.stable_id', caseSensitive: true }),
    ]),
    confirmed: Object.freeze([
      Object.freeze({
        evidenceClass: 'confirmed' as const,
        id: 'evidence:v2:0001',
        role: 'value-mapping' as const,
        location: Object.freeze({
          file: 'server/stable.ts',
          resolvable: true,
          lines: Object.freeze([1, 1] as const),
          excerpt: 'const stableId = row.stable_id;',
        }),
        provenance: Object.freeze({
          discoveredBy: Object.freeze(['ripgrep'] as const),
          verifiedBy: 'filesystem' as const,
          operations: Object.freeze([
            'RIPGREP_SEARCH',
            'FILESYSTEM_READ_RANGE',
          ] as const),
        }),
        reasonCodes: Object.freeze([
          'EXACT_TERM_MATCH',
          'DIRECT_ALIAS_MAPPING',
        ] as const),
      }),
    ]),
    candidates: Object.freeze([] as const),
    coverage: Object.freeze({
      backends: Object.freeze([
        Object.freeze({
          backend: 'ripgrep' as const,
          status: 'used' as const,
          completion: 'complete' as const,
          termination: 'none' as const,
          hitCount: 2,
        }),
      ]),
      strategyComplete: true,
      fallbackChecked: false,
      indexState: 'unknown' as const,
      indexFreshness: 'unknown' as const,
      limitsReached: Object.freeze([] as const),
      degradations: Object.freeze(['SNAPSHOT_CHANGED'] as const),
      exclusionSummary: Object.freeze({ SNAPSHOT_CHANGED: 3 }),
      abortSource: 'none' as const,
      unsatisfiedAnchors: Object.freeze([] as const),
      snapshot: Object.freeze({
        gitState: 'unknown' as const,
        consistency: 'changed' as const,
        filesChecked: 1,
        discardedEvidenceCount: 3,
      }),
      scope: Object.freeze({
        requested: Object.freeze(['server'] as const),
        effective: Object.freeze(['server'] as const),
        policyVersion: 'repo-scope-v1' as const,
        unmatchedLayers: Object.freeze([] as const),
      }),
      capabilities: Object.freeze({
        textSearch: 'supported-text-files' as const,
        semanticClassification: Object.freeze([
          'typescript',
          'javascript',
          'sql',
          'python',
          'go',
        ] as const),
        unsupportedLanguageHits: 0,
      }),
    }),
    nextActions: Object.freeze([] as const),
  }),
}) satisfies LocateResultV2;

export function evaluateLocateExecutionCharacterizationResultV2(
  expected: LocateResultV2,
  actual: unknown,
): boolean {
  const parsed = LocateResultV2Schema.safeParse(actual);
  return (
    parsed.success &&
    isDeepStrictEqual(
      createStableGoldenProjection(expected),
      createStableGoldenProjection(parsed.data),
    )
  );
}

export function expectedSemanticSha256IsValidV2(value: string): boolean {
  return HEX64.test(value);
}
