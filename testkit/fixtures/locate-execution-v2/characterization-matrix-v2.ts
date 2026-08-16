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
      'e6f5779796de027d5827de1bd579ffe0847b862f246932f59e3e6e58405681e7',
  }),
  Object.freeze({
    family: 'complete-no-hit',
    source: 'golden-companion',
    caseId: 'codegraph-no-result',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      'f59732a204b9519fa841592e675dcc713bcb91b6e2ef0cb37d5f07b99f73e9ce',
  }),
  Object.freeze({
    family: 'codegraph-unavailable-fallback',
    source: 'golden-companion',
    caseId: 'codegraph-missing',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '52f2e80467c9eff5cec70b5121f32e82f8ed704a51df0c831d1f12d9af3c3783',
  }),
  Object.freeze({
    family: 'codegraph-incomplete-fallback',
    source: 'golden-companion',
    caseId: 'codegraph-incomplete',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '84b384fc2d2e6e6f73a2236710af0c1765fa9d8be146b3fcaca6274964941958',
  }),
  Object.freeze({
    family: 'verified-primary-skip',
    source: 'golden-companion',
    caseId: 'codegraph-symbol-complete-no-fallback',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      'e6f5779796de027d5827de1bd579ffe0847b862f246932f59e3e6e58405681e7',
  }),
  Object.freeze({
    family: 'both-backends-unavailable',
    source: 'golden-companion',
    caseId: 'backend-unavailable',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '9da746a55f6458f94e1cf111056c135eafc4c15b567848be0624eb30018d15af',
  }),
  Object.freeze({
    family: 'caller-abort',
    source: 'golden-companion',
    caseId: 'codegraph-global-abort-no-fallback',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '20eacf637ac4a6118c1b4aec14ebfcfd85201ae5742389c7a887247b6084e396',
  }),
  Object.freeze({
    family: 'unsupported-language',
    source: 'golden-companion',
    caseId: 'ripgrep-incomplete',
    ownerFile: 'test/golden/text-evidence-engine.spec.ts',
    semanticSha256:
      '5c6a675a4529d5eeb1017ad325a5817a6b082e5cc93bb73709ae1619b1aefbdc',
  }),
  Object.freeze({
    family: 'evidence-ids',
    source: 'golden-companion',
    caseId: 'codegraph-secondary-provenance-table',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      'd6784baabf607fc628ec088d74eef6ad5ea8568218765dfc262b897ea70d6703',
  }),
  Object.freeze({
    family: 'backend-order',
    source: 'golden-companion',
    caseId: 'codegraph-incomplete',
    ownerFile: 'test/golden/codegraph-fallback.spec.ts',
    semanticSha256:
      '84b384fc2d2e6e6f73a2236710af0c1765fa9d8be146b3fcaca6274964941958',
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
    'a19da6e1572f53c88d27721c4af03fc80e9f2dd8cc03146a82848746b54667d9',
  deadlineAbort:
    '2843b1f9bd48cbacc7aefcd9ce1255b7c8ac0488360ec386d698fab73ef4ebce',
  locationRedaction:
    '9352dd81037d845aab84c2365032a516facddc6d0484584197cc71a8add5056d',
  upstreamExpandedHit:
    'b2c64aa8bc4e4a76ccb3317c464efc86ddfc8c58e70697bb34317e129077e049',
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
    '091bd3a6fae6b6b85150ee57f02c590d4fbf84bbe655313529ebbe04e47fa03c',
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
