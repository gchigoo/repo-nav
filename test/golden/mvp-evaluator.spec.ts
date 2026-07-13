import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { LocateResultSchema } from '../../src/contracts/index.js';
import {
  GoldenCaseSchema,
  PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS,
  REASON_CODE_NEGATIVE_PROBES,
  assertGoldenCase,
  applyEvidencePackFieldMutation,
  compareGoldenProjection,
  createEvidencePackMutationFixture,
  createStableGoldenProjection,
  type GoldenCase,
  type GoldenObservation,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const manifestRoot = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');
const expectedRoot = resolve(repositoryRoot, 'testkit', 'expected');

function loadCase(caseId: string): GoldenCase {
  const input: unknown = parse(
    readFileSync(resolve(manifestRoot, `${caseId}.yaml`), 'utf8'),
  );
  return GoldenCaseSchema.parse(input);
}

function loadSuccessResult(caseId: string) {
  const input: unknown = JSON.parse(
    readFileSync(resolve(expectedRoot, `${caseId}.json`), 'utf8'),
  );
  const result = LocateResultSchema.parse(input);
  if (!result.ok) {
    throw new Error(`${caseId} must contain a successful projection.`);
  }
  return result;
}

function observe(result: unknown, mcpIsError = false): GoldenObservation {
  const parsed = LocateResultSchema.parse(result);
  return {
    result: parsed,
    mcpIsError,
    structuredContent: parsed,
    textContent: JSON.stringify(parsed),
  };
}

function observeUnchecked(result: unknown, mcpIsError = false): unknown {
  return {
    result,
    mcpIsError,
    structuredContent: result,
    textContent: JSON.stringify(result),
  };
}

function successCase(caseId: string): GoldenSuccessCase {
  const goldenCase = loadCase(caseId);
  if (goldenCase.kind !== 'success') {
    throw new Error(`${caseId} must be a success case.`);
  }
  return goldenCase;
}

const evaluatorIdentity = {
  group: 'verification-contract',
  caseId: 'manifest-evaluator',
} as const;

describe.runIf(isSelected(evaluatorIdentity))('shared GoldenCaseEvaluator', () => {
  it('uses one public evaluator for success/error and normalizes only repositoryRoot', () => {
    const success = successCase('manifest-schema-success');
    const successResult = loadSuccessResult('foundation-success');
    const relocated = {
      ...successResult,
      evidence: {
        ...successResult.evidence,
        repositoryRoot: 'D:/temporary/repo-nav-fixture',
      },
    };
    expect(() => assertGoldenCase(success, observe(relocated))).not.toThrow();

    const errorCase = loadCase('manifest-schema-error');
    const errorResult = {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'terms must contain at least one item.',
        recoverable: true,
        suggestedAction: 'ADD_TERM',
      },
    } as const;
    expect(() =>
      assertGoldenCase(errorCase, observe(errorResult, true)),
    ).not.toThrow();
  });

  it('requires a reviewed companion snapshot for every success manifest', () => {
    const successManifests = readFileSync(
      resolve(manifestRoot, 'manifest-schema-success.yaml'),
      'utf8',
    );
    expect(successManifests).toContain('kind: success');
    expect(() => loadSuccessResult('foundation-success')).not.toThrow();
  });
});

const negativeIdentity = {
  group: 'verification-contract',
  caseId: 'evaluator-negative-self-test',
} as const;

describe.runIf(isSelected(negativeIdentity))(
  'GoldenCaseEvaluator deliberate failures',
  () => {
    it('rejects unexpected evidence, wrong order, forbidden IDs, coverage, and exclusions', () => {
      const candidateCase = successCase('sibling-candidate');
      const candidateResult = loadSuccessResult('sibling-candidate');
      const firstCandidate = candidateResult.evidence.candidates[0];
      if (firstCandidate === undefined) {
        throw new Error('Expected a candidate fixture.');
      }

      const unexpected = {
        ...candidateResult,
        evidence: {
          ...candidateResult.evidence,
          candidates: [
            ...candidateResult.evidence.candidates,
            { ...firstCandidate, id: `evidence:v1:${'a'.repeat(64)}` },
          ],
        },
      };
      expect(() => assertGoldenCase(candidateCase, observe(unexpected))).toThrow(
        /count|projection/iu,
      );

      const wrongOrder = {
        ...candidateResult,
        evidence: {
          ...candidateResult.evidence,
          candidates: [...candidateResult.evidence.candidates].reverse(),
        },
      };
      expect(() => assertGoldenCase(candidateCase, observe(wrongOrder))).toThrow(
        /order|projection/iu,
      );

      const forbiddenCase = GoldenCaseSchema.parse({
        ...candidateCase,
        expected: {
          ...candidateCase.expected,
          forbiddenEvidenceIds: [firstCandidate.id],
        },
      });
      expect(() =>
        assertGoldenCase(forbiddenCase, observe(candidateResult)),
      ).toThrow(/forbidden/iu);

      const missingCoverageCase = GoldenCaseSchema.parse({
        ...candidateCase,
        expected: {
          ...candidateCase.expected,
          requiredCoverageCodes: ['BACKEND_PROCESS_FAILED'],
        },
      });
      expect(() =>
        assertGoldenCase(missingCoverageCase, observe(candidateResult)),
      ).toThrow(/coverage/iu);

      const lowExclusionCase = GoldenCaseSchema.parse({
        ...candidateCase,
        expected: {
          ...candidateCase.expected,
          minimumExclusionCounts: { UNVERIFIED_FILE_CONTENT: 99 },
        },
      });
      expect(() =>
        assertGoldenCase(lowExclusionCase, observe(candidateResult)),
      ).toThrow(/exclusion/iu);
    });

    it('rejects nextAction and promotion missing/order mutations', () => {
      const goldenCase = successCase('sibling-candidate');
      const result = loadSuccessResult('sibling-candidate');
      const first = result.evidence.candidates[0];
      if (first === undefined) {
        throw new Error('Expected a candidate fixture.');
      }

      const wrongAction = {
        ...result,
        evidence: { ...result.evidence, nextActions: ['ADD_TERM'] },
      };
      expect(() => assertGoldenCase(goldenCase, observe(wrongAction))).toThrow(
        /nextActions|projection/iu,
      );

      const missingPromotion: unknown = {
        ...result,
        evidence: {
          ...result.evidence,
          candidates: [
            { ...first, promotionRequirements: undefined },
            ...result.evidence.candidates.slice(1),
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observeUnchecked(missingPromotion)),
      ).toThrow();

      const wrongPromotionOrder = {
        ...result,
        evidence: {
          ...result.evidence,
          candidates: [
            {
              ...first,
              promotionRequirements: [...first.promotionRequirements].reverse(),
            },
            ...result.evidence.candidates.slice(1),
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observe(wrongPromotionOrder)),
      ).toThrow(/promotionRequirements|projection/iu);
    });

    it('rejects provenance source, verifiedBy, and operation ordering mutations', () => {
      const goldenCase = successCase('codegraph-incomplete');
      const result = loadSuccessResult('codegraph-incomplete');
      const first = result.evidence.confirmed[0];
      if (first === undefined) {
        throw new Error('Expected confirmed provenance fixture.');
      }

      const wrongSourceOrder = {
        ...result,
        evidence: {
          ...result.evidence,
          confirmed: [
            {
              ...first,
              provenance: {
                ...first.provenance,
                discoveredBy: [...first.provenance.discoveredBy].reverse(),
              },
            },
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observe(wrongSourceOrder)),
      ).toThrow(/discoveredBy|projection/iu);

      const wrongOperationOrder = {
        ...result,
        evidence: {
          ...result.evidence,
          confirmed: [
            {
              ...first,
              provenance: {
                ...first.provenance,
                operations: [...first.provenance.operations].reverse(),
              },
            },
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observe(wrongOperationOrder)),
      ).toThrow(/operations|projection/iu);

      const wrongVerifiedBy: unknown = {
        ...result,
        evidence: {
          ...result.evidence,
          confirmed: [
            {
              ...first,
              provenance: { ...first.provenance, verifiedBy: 'backend' },
            },
          ],
        },
      };
      expect(() =>
        assertGoldenCase(goldenCase, observeUnchecked(wrongVerifiedBy)),
      ).toThrow();
    });

    it('rejects error structured/text parity mismatches', () => {
      const errorCase = loadCase('manifest-schema-error');
      const result = LocateResultSchema.parse({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'safe error',
          recoverable: true,
          suggestedAction: 'ADD_TERM',
        },
      });
      const mismatch = {
        result,
        mcpIsError: true,
        structuredContent: result,
        textContent: JSON.stringify({ ok: true }),
      };
      expect(() => assertGoldenCase(errorCase, mismatch)).toThrow(
        /parity|differ/iu,
      );
    });

    it('detects every public EvidencePack field mutation except the root allowlist', () => {
      const fixture = createEvidencePackMutationFixture();
      const expected = createStableGoldenProjection(fixture);
      for (const mutation of PUBLIC_EVIDENCE_PACK_FIELD_MUTATIONS) {
        const mutated = applyEvidencePackFieldMutation(fixture, mutation);
        const parsed = LocateResultSchema.safeParse(mutated);
        if (mutation.normalized) {
          expect(parsed.success, mutation.path).toBe(true);
          if (parsed.success) {
            expect(
              compareGoldenProjection(expected, parsed.data).matches,
              mutation.path,
            ).toBe(true);
          }
          continue;
        }
        if (parsed.success) {
          expect(
            compareGoldenProjection(expected, parsed.data).matches,
            mutation.path,
          ).toBe(false);
        } else {
          expect(parsed.error.issues.length, mutation.path).toBeGreaterThan(0);
        }
      }
    });

    it('runs a deliberate false-positive mutation for every confirmed/candidate reason code', () => {
      const fixture = createEvidencePackMutationFixture();
      for (const probe of REASON_CODE_NEGATIVE_PROBES) {
        const path =
          probe.family === 'ConfirmedReasonCode'
            ? 'evidence.confirmed.0.reasonCodes'
            : 'evidence.candidates.0.reasonCodes';
        const alternate = REASON_CODE_NEGATIVE_PROBES.find(
          (candidate) =>
            candidate.family === probe.family && candidate.code !== probe.code,
        );
        if (alternate === undefined) {
          throw new Error(`Missing alternate negative probe for ${probe.family}.`);
        }
        const baseline = LocateResultSchema.parse(
          applyEvidencePackFieldMutation(fixture, {
            path,
            replacement: [alternate.code],
            normalized: false,
          }),
        );
        const expected = createStableGoldenProjection(baseline);
        const mutated = applyEvidencePackFieldMutation(baseline, {
          path,
          replacement: [alternate.code, probe.code],
          normalized: false,
        });
        const parsed = LocateResultSchema.parse(mutated);
        expect(
          compareGoldenProjection(expected, parsed).matches,
          `${probe.family}.${probe.code}`,
        ).toBe(false);
      }
    });
  },
);
