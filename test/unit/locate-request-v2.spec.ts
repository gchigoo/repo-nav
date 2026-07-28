import { describe, expect, it } from 'vitest';

import { LocateRequestSchema, normalizeLocateAnchors, normalizeSearchTerms } from '../../src/contracts/request.js';
import { assertRawRepoPathV2 } from '../../src/contracts/v2/filesystem-input.js';
import {
  guardLocateRequestRawV2,
  parseLocateRequestV2,
  safeParseLocateRequestV2,
} from '../../src/evidence/request-outcome/locate-request-raw-guard-v2.js';
import { FILE_ANCHOR_CASES_V2 } from '../../testkit/fixtures/input-v2/file-anchor-input-v2.js';
import { PLATFORM_INPUT_MARKERS_V2 } from '../../testkit/fixtures/input-v2/platform-input-v2.js';
import { QUESTION_NON_INTERFERENCE_V2 } from '../../testkit/fixtures/input-v2/question-non-interference-v2.js';
import { RAW_BUDGET_MARKERS_V2 } from '../../testkit/fixtures/input-v2/raw-request-budget-v2.js';
import { REPOSITORY_PATH_CASES_V2 } from '../../testkit/fixtures/input-v2/repository-path-input-v2.js';
import { SEMANTIC_INPUT_CASES_V2 } from '../../testkit/fixtures/input-v2/semantic-input-v2.js';
import { recordPlatformAssertionMarker } from '../../testkit/testing/platform-contract.js';
import { isSelected } from '../../testkit/testing/selection.js';

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'repository-path-input',
  }),
)('F6-INPUT-001 repository-path-input', () => {
  it('preserves raw repoPath code units and rejects NUL/oversize', () => {
    expect(REPOSITORY_PATH_CASES_V2.length).toBeGreaterThan(0);
    const spaced = '  spaced-repo  ';
    const parsed = LocateRequestSchema.parse({
      repoPath: spaced,
      terms: ['Foo'],
    });
    expect(parsed.repoPath).toBe(spaced);
    expect(() => assertRawRepoPathV2('bad\0path')).toThrow(/NUL/);
    expect(() => assertRawRepoPathV2('x'.repeat(4097))).toThrow(/4096/);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'file-anchor-input',
  }),
)('F6-FILE-001 file-anchor-input', () => {
  it('rejects backslash/absolute/escape and preserves legal POSIX paths', () => {
    for (const row of FILE_ANCHOR_CASES_V2) {
      const result = LocateRequestSchema.safeParse({
        repoPath: '.',
        terms: ['Foo'],
        anchors: [{ kind: 'file', value: row.value }],
      });
      expect(result.success).toBe(row.ok);
      if (row.ok && result.success) {
        expect(result.data.anchors?.[0]?.value).toBe(row.value);
        expect(
          normalizeLocateAnchors(result.data.anchors ?? [])[0]?.value,
        ).toBe(row.value);
      }
    }
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'semantic-input',
  }),
)('F6-SEMANTIC-001 semantic-input', () => {
  it('keeps question optional and applies NFKC to terms', () => {
    expect(SEMANTIC_INPUT_CASES_V2.length).toBeGreaterThan(0);
    const missing = LocateRequestSchema.safeParse({
      repoPath: '.',
      terms: ['Foo'],
    });
    expect(missing.success).toBe(true);
    const blankQuestion = LocateRequestSchema.safeParse({
      repoPath: '.',
      terms: ['Foo'],
      question: '   ',
    });
    expect(blankQuestion.success).toBe(false);
    const nfkc = LocateRequestSchema.parse({
      repoPath: '.',
      terms: ['ｈｃｐ＿ｉｄ'],
    });
    expect(normalizeSearchTerms(nfkc.terms)[0]?.value).toBe('hcp_id');
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'question-non-interference',
  }),
)('F6-QUESTION-001 question-non-interference', () => {
  it('does not change normalized terms across question variants', () => {
    const baselines = QUESTION_NON_INTERFERENCE_V2.map((question) => {
      const parsed = parseLocateRequestV2({
        repoPath: '.',
        terms: ['Foo', 'Bar'],
        ...(question === undefined ? {} : { question }),
      });
      return normalizeSearchTerms(parsed.terms);
    });
    for (let i = 1; i < baselines.length; i += 1) {
      expect(baselines[i]).toEqual(baselines[0]);
    }
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'raw-budget',
  }),
)('F6-RAW-001 raw-budget', () => {
  it('rejects terms/layers N+1 before reading poison elements', () => {
    expect(RAW_BUDGET_MARKERS_V2).toContain('terms-n-plus-one');
    expect(RAW_BUDGET_MARKERS_V2).toContain('layers-8-poison');
    const terms = Array.from({ length: 17 }, (_, i) => `t${String(i)}`);
    expect(() =>
      guardLocateRequestRawV2({
        repoPath: '.',
        terms,
      }),
    ).toThrow(/terms exceeds maximum count/);
    const layers = [
      'client',
      'server',
      'db',
      'test',
      'docs',
      'config',
      'unknown',
      'poison',
    ];
    expect(() =>
      guardLocateRequestRawV2({
        repoPath: '.',
        terms: ['Foo'],
        layers,
      }),
    ).toThrow(/layers exceeds maximum count/);
    const ok = safeParseLocateRequestV2({
      repoPath: '.',
      terms: ['Foo'],
    });
    expect(ok.success).toBe(true);
  });
});

describe.runIf(
  isSelected({
    group: 'input-abort-contract-v2',
    caseId: 'platform-input-boundary',
  }),
)('F6-INPUT-001 platform-input-boundary', () => {
  it('emits required platform markers', () => {
    expect(PLATFORM_INPUT_MARKERS_V2).toEqual([
      'repo-path-code-units',
      'file-anchor-backslash-rejected',
      'raw-budget-boundary',
    ]);
    const spaced = '  repo  ';
    expect(
      LocateRequestSchema.parse({ repoPath: spaced, terms: ['Foo'] }).repoPath,
    ).toBe(spaced);
    recordPlatformAssertionMarker('F6-INPUT-001', 'repo-path-code-units');
    expect(
      LocateRequestSchema.safeParse({
        repoPath: '.',
        terms: ['Foo'],
        anchors: [{ kind: 'file', value: 'a\\b.ts' }],
      }).success,
    ).toBe(false);
    recordPlatformAssertionMarker(
      'F6-INPUT-001',
      'file-anchor-backslash-rejected',
    );
    expect(() =>
      guardLocateRequestRawV2({
        repoPath: '.',
        terms: Array.from({ length: 17 }, (_, i) => `t${String(i)}`),
      }),
    ).toThrow();
    recordPlatformAssertionMarker('F6-INPUT-001', 'raw-budget-boundary');
  });
});
