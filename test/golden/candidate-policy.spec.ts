import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import {
  assertGoldenCase,
  GoldenCaseSchema,
  type GoldenObservation,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import {
  CandidateFixtureBackend,
} from '../../testkit/fixtures/candidate-policy/candidate-fixture-backend.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const manifestRoot = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');
const CASE_IDS = [
  'sibling-candidate',
  'alias-candidate',
  'sibling-false-positive',
] as const;
const EXPECTED_CANDIDATES = [
  { symbol: 'sourceAlias', reasonCodes: ['ALIAS_SOURCE_NEIGHBOR'] },
  { symbol: 'hcpId', reasonCodes: ['SAME_SCOPE_SIMILAR_IDENTIFIER'] },
  {
    symbol: 'hcpName',
    reasonCodes: [
      'SAME_SCOPE_SIMILAR_IDENTIFIER',
      'SAME_ENTITY_SIBLING',
    ],
  },
  {
    symbol: 'hcpEmail',
    reasonCodes: [
      'SAME_SCOPE_SIMILAR_IDENTIFIER',
      'SAME_ENTITY_SIBLING',
    ],
  },
] as const;

function loadCase(caseId: (typeof CASE_IDS)[number]): GoldenSuccessCase {
  const parsed = GoldenCaseSchema.parse(
    parse(readFileSync(resolve(manifestRoot, `${caseId}.yaml`), 'utf8')),
  );
  if (parsed.kind !== 'success') {
    throw new Error(`${caseId} must be a success case.`);
  }
  return parsed;
}

async function observe(goldenCase: GoldenSuccessCase): Promise<GoldenObservation> {
  const engine = createCanonicalLocateEngineHarnessV2([new CandidateFixtureBackend()],
    new NodeRepositoryReader(),
  ).service;
  const result = await engine.locate(goldenCase.request, {
    signal: new AbortController().signal,
  });
  return {
    result: result as any,
    mcpIsError: !result.ok,
    structuredContent: result as any,
    textContent: JSON.stringify(result),
  };
}

for (const caseId of CASE_IDS) {
  describe.runIf(isSelected({ group: 'candidate-policy', caseId }))(
    caseId,
    () => {
      it('matches the bounded candidate policy manifest', async () => {
        const goldenCase = loadCase(caseId);
        const observation = await observe(goldenCase);
        expect(() => assertGoldenCase(goldenCase, observation)).not.toThrow();
        expect(observation.result).toMatchObject({
          ok: true,
          evidence: {
            confirmed: [{ role: 'value-mapping' }],
            candidates: expect.any(Array),
          },
        });
        if (observation.result.ok) {
          expect(
            observation.result.evidence.candidates.map((candidate) => ({
              symbol: candidate.location.symbol,
              reasonCodes: candidate.reasonCodes,
            })),
          ).toEqual(EXPECTED_CANDIDATES);
          expect(
            observation.result.evidence.candidates.every(
              (candidate) =>
                !candidate.reasonCodes.includes('SECONDARY_BACKEND_HIT'),
            ),
          ).toBe(true);
        }
      });
    },
  );
}
