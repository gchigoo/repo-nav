import { isDeepStrictEqual } from 'node:util';

import type {
  CandidateEvidenceV2,
  ConfirmedEvidenceV2,
} from '../../src/contracts/v2/locate-result-v2.js';
import {
  GoldenCaseSchema,
  GoldenObservationSchema,
  type EvidenceExpectation,
  type GoldenCase,
  type GoldenObservation,
} from './golden-case.js';
import {
  compareGoldenProjection,
  createMissingGoldenProjection,
  loadExpectedGoldenProjection,
  overwriteGoldenProjection,
} from './golden-projection.js';

type EvaluatedEvidence = ConfirmedEvidenceV2 | CandidateEvidenceV2;

export interface GoldenEvaluationIssue {
  readonly path: string;
  readonly message: string;
}

function evaluateTransportParity(
  observation: GoldenObservation,
  expectedMcpIsError: boolean,
): GoldenEvaluationIssue[] {
  const issues: GoldenEvaluationIssue[] = [];
  if (observation.mcpIsError !== expectedMcpIsError) {
    issues.push({ path: 'mcpIsError', message: 'MCP error flag differs.' });
  }

  let textResult: unknown;
  try {
    textResult = JSON.parse(observation.textContent) as unknown;
  } catch {
    issues.push({ path: 'textContent', message: 'Text content is not JSON.' });
  }
  if (
    !isDeepStrictEqual(observation.structuredContent, observation.result) ||
    !isDeepStrictEqual(textResult, observation.result)
  ) {
    issues.push({
      path: 'structuredTextParity',
      message: 'Structured content and text fallback differ from the result.',
    });
  }
  return issues;
}

function evidenceMatches(
  evidence: EvaluatedEvidence,
  expectation: EvidenceExpectation,
): boolean {
  return (
    evidence.location.file === expectation.file &&
    evidence.location.excerpt.includes(expectation.contains) &&
    (expectation.role === undefined || evidence.role === expectation.role) &&
    (expectation.reasonCodes === undefined ||
      expectation.reasonCodes.every((code) =>
        (evidence.reasonCodes as readonly string[]).includes(code),
      ))
  );
}

function evaluateExpectations(
  path: string,
  evidence: readonly EvaluatedEvidence[],
  expectations: readonly EvidenceExpectation[],
): GoldenEvaluationIssue[] {
  const issues: GoldenEvaluationIssue[] = [];
  if (evidence.length !== expectations.length) {
    issues.push({
      path: `${path}.length`,
      message: `Evidence count differs: expected ${expectations.length}, received ${evidence.length}.`,
    });
  }
  for (const [index, expectation] of expectations.entries()) {
    const item = evidence[index];
    if (item === undefined || !evidenceMatches(item, expectation)) {
      issues.push({
        path: `${path}[${index}]`,
        message: `Evidence order/content differs for ${expectation.file}.`,
      });
    }
  }
  return issues;
}

function evaluateCompanionProjection(
  caseId: string,
  observation: GoldenObservation,
  priorIssues: readonly GoldenEvaluationIssue[],
): GoldenEvaluationIssue[] {
  if (priorIssues.length === 0) {
    createMissingGoldenProjection(caseId, observation.result);
    overwriteGoldenProjection(caseId, observation.result);
  }
  try {
    const comparison = compareGoldenProjection(
      loadExpectedGoldenProjection(caseId),
      observation.result,
    );
    return comparison.matches
      ? []
      : [
          {
            path: comparison.firstDifferencePath ?? 'result',
            message:
              'Full stable projection differs from the companion snapshot.',
          },
        ];
  } catch (error: unknown) {
    return [
      {
        path: 'companionSnapshot',
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function evaluateSuccess(
  goldenCase: Extract<GoldenCase, { readonly kind: 'success' }>,
  observation: GoldenObservation,
): GoldenEvaluationIssue[] {
  const result = observation.result;
  if (!result.ok) {
    return [{ path: 'result.ok', message: 'Expected a successful result.' }];
  }

  const issues: GoldenEvaluationIssue[] = evaluateTransportParity(
    observation,
    false,
  );
  if (result.evidence.status !== goldenCase.expected.status) {
    issues.push({ path: 'result.evidence.status', message: 'Status differs.' });
  }
  issues.push(
    ...evaluateExpectations(
      'expected.confirmed',
      result.evidence.confirmed,
      goldenCase.expected.confirmed,
    ),
    ...evaluateExpectations(
      'expected.candidates',
      result.evidence.candidates,
      goldenCase.expected.candidates,
    ),
  );

  const publicIds = new Set([
    ...result.evidence.confirmed.map((item) => item.id),
    ...result.evidence.candidates.map((item) => item.id),
  ]);
  for (const forbiddenId of goldenCase.expected.forbiddenEvidenceIds) {
    if (publicIds.has(forbiddenId)) {
      issues.push({
        path: 'expected.forbiddenEvidenceIds',
        message: `Forbidden evidence ID was present: ${forbiddenId}.`,
      });
    }
  }

  const coverageCodes = new Set([
    ...result.evidence.coverage.backends.flatMap((attempt) =>
      attempt.reasonCode === undefined ? [] : [attempt.reasonCode],
    ),
    ...result.evidence.coverage.limitsReached,
  ]);
  for (const requiredCode of goldenCase.expected.requiredCoverageCodes) {
    if (!coverageCodes.has(requiredCode)) {
      issues.push({
        path: 'expected.requiredCoverageCodes',
        message: `Required coverage code was absent: ${requiredCode}.`,
      });
    }
  }

  for (const [code, minimum] of Object.entries(
    goldenCase.expected.minimumExclusionCounts,
  )) {
    const actual =
      result.evidence.coverage.exclusionSummary[
        code as keyof typeof result.evidence.coverage.exclusionSummary
      ] ?? 0;
    if (actual < minimum) {
      issues.push({
        path: `expected.minimumExclusionCounts.${code}`,
        message: `Expected at least ${minimum} exclusions, received ${actual}.`,
      });
    }
  }

  issues.push(
    ...evaluateCompanionProjection(goldenCase.id, observation, issues),
  );

  return issues;
}

function evaluateError(
  goldenCase: Extract<GoldenCase, { readonly kind: 'error' }>,
  observation: GoldenObservation,
): GoldenEvaluationIssue[] {
  const issues: GoldenEvaluationIssue[] = [];
  if (observation.result.ok) {
    return [{ path: 'result.ok', message: 'Expected an error result.' }];
  }

  const expectedError = goldenCase.expected.error;
  const actualError = observation.result.error;
  if (actualError.code !== expectedError.code) {
    issues.push({ path: 'result.error.code', message: 'Error code differs.' });
  }
  if (actualError.recoverable !== expectedError.recoverable) {
    issues.push({
      path: 'result.error.recoverable',
      message: 'Recoverable flag differs.',
    });
  }
  const actualSuggestedAction =
    'suggestedAction' in actualError ? actualError.suggestedAction : undefined;
  const expectedSuggestedAction =
    'suggestedAction' in expectedError
      ? expectedError.suggestedAction
      : undefined;
  if (actualSuggestedAction !== expectedSuggestedAction) {
    issues.push({
      path: 'result.error.suggestedAction',
      message: 'Suggested action differs.',
    });
  }
  if (goldenCase.expected.structuredTextParity) {
    issues.push(
      ...evaluateTransportParity(observation, goldenCase.expected.mcpIsError),
    );
  }

  return issues;
}

export function evaluateGoldenCase(
  caseInput: unknown,
  observationInput: unknown,
): readonly GoldenEvaluationIssue[] {
  const goldenCase = GoldenCaseSchema.parse(caseInput);
  const observation = GoldenObservationSchema.parse(observationInput);

  return goldenCase.kind === 'success'
    ? evaluateSuccess(goldenCase, observation)
    : evaluateError(goldenCase, observation);
}

export function assertGoldenCase(
  caseInput: unknown,
  observationInput: unknown,
): void {
  const issues = evaluateGoldenCase(caseInput, observationInput);
  if (issues.length > 0) {
    throw new Error(
      issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'),
    );
  }
}
