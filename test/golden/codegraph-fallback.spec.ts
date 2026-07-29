import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import type {
  BackendHit,
  BackendSearchResult,
} from '../../src/contracts/index.js';
import { createCanonicalLocateEngineHarnessV2 } from '../../testkit/testing/create-canonical-locate-engine-harness-v2.js';
import { NodeRepositoryReader } from '../../src/repository/node-repository-reader.js';
import {
  assertGoldenCase,
  GoldenCaseSchema,
  type GoldenObservation,
  type GoldenSuccessCase,
} from '../../testkit/contracts/index.js';
import { CodeGraphTransitionBackend } from '../../testkit/fixtures/codegraph/codegraph-transition-backend.js';
import { isSelected } from '../../testkit/testing/selection.js';

const CASE_IDS = [
  'codegraph-missing',
  'codegraph-no-result',
  'codegraph-failed',
  'codegraph-incomplete',
  'codegraph-global-abort-no-fallback',
  'codegraph-local-timeout-fallback',
  'codegraph-hit-unverified',
  'codegraph-symbol-complete-no-fallback',
  'codegraph-secondary-provenance-table',
  'backend-unavailable',
] as const;
type CaseId = (typeof CASE_IDS)[number];

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const manifestRoot = resolve(repositoryRoot, 'testkit', 'manifests', 'golden');

function hit(
  source: 'codegraph' | 'ripgrep',
  file = 'server/mapping.ts',
  matchedText = 'export const targetField = row.source_field;',
): BackendHit {
  return {
    file,
    lines: file === 'server/mapping.ts' ? [2, 2] : [1, 1],
    matchedText,
    source,
    reasonCodes: ['LITERAL_TERM_HIT'],
  };
}

function result(
  overrides: Partial<BackendSearchResult> = {},
): BackendSearchResult {
  return {
    health: { state: 'available', version: '1.1.6' },
    hits: [],
    complete: true,
    canSkipFallbackIfVerified: false,
    ...overrides,
  };
}

function loadCase(caseId: CaseId): GoldenSuccessCase {
  const value = GoldenCaseSchema.parse(
    parse(readFileSync(resolve(manifestRoot, `${caseId}.yaml`), 'utf8')),
  );
  if (value.kind !== 'success') {
    throw new Error(`${caseId} must be a success Golden case.`);
  }
  return value;
}

interface TransitionRun {
  readonly observation: GoldenObservation;
  readonly codegraph: CodeGraphTransitionBackend;
  readonly ripgrep: CodeGraphTransitionBackend;
}

async function runCase(caseId: CaseId): Promise<TransitionRun> {
  const goldenCase = loadCase(caseId);
  const caller = new AbortController();
  let codegraphResult = result();
  let ripgrepResult = result({ hits: [hit('ripgrep')] });

  switch (caseId) {
    case 'codegraph-missing':
      codegraphResult = result({
        health: {
          state: 'missing',
          version: '1.1.6',
          indexFound: false,
          reasonCode: 'CODEGRAPH_INDEX_MISSING',
        },
        complete: false,
      });
      break;
    case 'codegraph-no-result':
      codegraphResult = result({
        health: {
          state: 'available',
          version: '1.1.6',
          reasonCode: 'CODEGRAPH_NO_RESULT',
        },
      });
      break;
    case 'codegraph-failed':
      codegraphResult = result({
        health: { state: 'error', reasonCode: 'BACKEND_PROCESS_FAILED' },
        complete: false,
      });
      break;
    case 'codegraph-incomplete':
      codegraphResult = result({
        hits: [hit('codegraph')],
        complete: false,
      });
      break;
    case 'codegraph-global-abort-no-fallback':
      codegraphResult = result({
        health: { state: 'error', reasonCode: 'BACKEND_ABORTED' },
        complete: false,
      });
      ripgrepResult = result({ hits: [] });
      break;
    case 'codegraph-local-timeout-fallback':
      codegraphResult = result({
        health: { state: 'error', reasonCode: 'BACKEND_ABORTED' },
        complete: false,
      });
      break;
    case 'codegraph-hit-unverified':
      codegraphResult = result({
        hits: [
          hit(
            'codegraph',
            'server/unverified.ts',
            "export const staleValue = 'stale';",
          ),
        ],
        canSkipFallbackIfVerified: true,
      });
      break;
    case 'codegraph-symbol-complete-no-fallback':
      codegraphResult = result({
        hits: [
          {
            file: 'server/definition.ts',
            symbol: 'AlphaMapping',
            lines: [1, 1],
            source: 'codegraph',
            reasonCodes: ['SYMBOL_SEARCH_HIT'],
          },
        ],
        canSkipFallbackIfVerified: true,
      });
      ripgrepResult = result({ hits: [] });
      break;
    case 'codegraph-secondary-provenance-table': {
      const primary = hit(
        'codegraph',
        'server/primary.ts',
        'export const opaquePrimary = 1;',
      );
      const mergedPrimary = hit(
        'codegraph',
        'server/merged.ts',
        'export const opaqueMerged = 3;',
      );
      const secondary = hit(
        'ripgrep',
        'server/secondary.ts',
        'export const opaqueSecondary = 2;',
      );
      const mergedSecondary = hit(
        'ripgrep',
        'server/merged.ts',
        'export const opaqueMerged = 3;',
      );
      codegraphResult = result({ hits: [primary, mergedPrimary] });
      ripgrepResult = result({ hits: [secondary, mergedSecondary] });
      break;
    }
    case 'backend-unavailable':
      codegraphResult = result({
        health: { state: 'unavailable', reasonCode: 'CODEGRAPH_UNAVAILABLE' },
        complete: false,
      });
      ripgrepResult = result({
        health: { state: 'missing', reasonCode: 'RIPGREP_UNAVAILABLE' },
        hits: [],
        complete: false,
      });
      break;
  }

  const codegraph = new CodeGraphTransitionBackend(
    'codegraph',
    codegraphResult,
    caseId === 'codegraph-global-abort-no-fallback'
      ? () => caller.abort(new Error('caller aborted'))
      : undefined,
  );
  const ripgrep = new CodeGraphTransitionBackend('ripgrep', ripgrepResult);
  const resultValue: any = await createCanonicalLocateEngineHarnessV2([codegraph, ripgrep],
    new NodeRepositoryReader(),
  ).service.locate(goldenCase.request, { signal: caller.signal });
  return {
    codegraph,
    ripgrep,
    observation: {
      result: resultValue,
      mcpIsError: !resultValue.ok,
      structuredContent: resultValue,
      textContent: JSON.stringify(resultValue),
    },
  };
}

for (const caseId of CASE_IDS) {
  describe.runIf(isSelected({ group: 'codegraph-fallback', caseId }))(
    caseId,
    () => {
      it('matches the explicit fallback transition contract', async () => {
        const goldenCase = loadCase(caseId);
        const run = await runCase(caseId);
        expect(() => assertGoldenCase(goldenCase, run.observation)).not.toThrow();
        expect(run.codegraph.calls).toBe(1);

        if (!run.observation.result.ok) {
          throw new Error('Fallback Golden cases must return recoverable results.');
        }
        const evidence = run.observation.result.evidence;
        if (caseId === 'codegraph-global-abort-no-fallback') {
          expect(run.ripgrep.calls).toBe(0);
          expect(evidence.coverage.fallbackChecked).toBe(false);
          expect(evidence.coverage.backends.map((attempt) => attempt.backend)).toEqual([
            'codegraph',
          ]);
          expect(evidence.coverage.backends[0]?.status).toBe('failed');
          expect(evidence.coverage.indexState).toBe('error');
          return;
        }
        if (caseId === 'codegraph-symbol-complete-no-fallback') {
          expect(run.ripgrep.calls).toBe(0);
          expect(evidence.coverage.fallbackChecked).toBe(false);
          expect(evidence.coverage.backends).toHaveLength(1);
          expect(evidence.confirmed[0]?.provenance.discoveredBy).toEqual([
            'codegraph',
          ]);
          return;
        }

        expect(run.ripgrep.calls).toBe(1);
        expect(evidence.coverage.fallbackChecked).toBe(true);
        expect(evidence.coverage.backends.map((attempt) => attempt.backend)).toEqual([
          'codegraph',
          'ripgrep',
        ]);
        if (caseId === 'codegraph-incomplete') {
          expect(evidence.confirmed[0]?.provenance.discoveredBy).toEqual([
            'codegraph',
            'ripgrep',
          ]);
          expect(evidence.coverage.limitsReached).toEqual([]);
        }
        if (caseId === 'codegraph-missing') {
          expect(evidence.nextActions).not.toContain('INITIALIZE_CODEGRAPH');
        }
        if (caseId === 'codegraph-hit-unverified') {
          expect(evidence.coverage.exclusionSummary.UNVERIFIED_FILE_CONTENT).toBe(
            1,
          );
        }
        if (caseId === 'codegraph-local-timeout-fallback') {
          expect(evidence.coverage.backends[0]?.status).toBe('failed');
          expect(evidence.coverage.indexState).toBe('error');
        }
        if (caseId === 'codegraph-secondary-provenance-table') {
          expect(
            evidence.candidates.map((candidate) => ({
              file: candidate.location.file,
              discoveredBy: candidate.provenance.discoveredBy,
              reasons: candidate.reasonCodes,
            })),
          ).toEqual([
            {
              file: 'server/secondary.ts',
              discoveredBy: ['ripgrep'],
              reasons: ['SECONDARY_BACKEND_HIT'],
            },
          ]);
        }
      });
    },
  );
}

describe.runIf(
  isSelected({
    group: 'codegraph-fallback',
    caseId: 'codegraph-symbol-complete-no-fallback',
  }),
)('multi-symbol fallback guard', () => {
  it('still invokes ripgrep when only one of multiple requested symbols is verified', async () => {
    const goldenCase = loadCase('codegraph-symbol-complete-no-fallback');
    const codegraph = new CodeGraphTransitionBackend(
      'codegraph',
      result({
        hits: [
          {
            file: 'server/definition.ts',
            symbol: 'AlphaMapping',
            lines: [1, 1],
            source: 'codegraph',
            reasonCodes: ['SYMBOL_SEARCH_HIT'],
          },
        ],
        canSkipFallbackIfVerified: false,
      }),
    );
    const ripgrep = new CodeGraphTransitionBackend(
      'ripgrep',
      result({ hits: [] }),
    );
    const request = {
      ...goldenCase.request,
      terms: ['AlphaMapping', 'BetaMapping'],
      anchors: [
        { kind: 'symbol' as const, value: 'AlphaMapping' },
        { kind: 'symbol' as const, value: 'BetaMapping' },
      ],
    };

    const located = await createCanonicalLocateEngineHarnessV2([codegraph, ripgrep],
      new NodeRepositoryReader(),
    ).service.locate(request, { signal: new AbortController().signal });

    expect(located.ok).toBe(true);
    if (!located.ok) {
      throw new Error('Expected a recoverable result.');
    }
    expect(ripgrep.calls).toBe(1);
    expect(located.evidence.coverage.fallbackChecked).toBe(true);
  });
});
