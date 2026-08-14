import { describe, expect, it } from 'vitest';

import { isSelected } from '../../testkit/testing/selection.js';
import {
  parseCheckedJson,
  readCheckedChildResult,
  validateCliColdStartReport,
  // @ts-expect-error untyped benchmark module
} from '../../tools/benchmark/cli-cold-start.mjs';

const positiveSamples = Object.freeze(
  Array.from({ length: 20 }, (_, index) => index + 0.5),
);
const expectedMedian = 10;
const expectedP90 = 17.5;

function report() {
  return {
    schemaVersion: 1,
    sampleCount: 20,
    commands: {
      bareNode: {
        samplesMs: positiveSamples,
        medianMs: expectedMedian,
        p90Ms: expectedP90,
      },
      help: {
        samplesMs: positiveSamples,
        medianMs: expectedMedian,
        p90Ms: expectedP90,
      },
      version: {
        samplesMs: positiveSamples,
        medianMs: expectedMedian,
        p90Ms: expectedP90,
      },
    },
    application: {
      help: { maxRssKilobytes: 1024, applicationLoaderCount: 0 },
      version: { maxRssKilobytes: 1024, applicationLoaderCount: 0 },
    },
    package: {
      entryCount: 1,
      packedBytes: 1,
      unpackedBytes: 1,
    },
  };
}

describe.runIf(
  isSelected({
    group: 'debug-cli-shell',
    caseId: 'cli-cold-start-benchmark',
  }),
)('CLI cold-start benchmark report', () => {
  it('accepts finite positive samples and zero help/version application loads', () => {
    expect(validateCliColdStartReport(report())).toEqual(report());
  });

  it.each([
    [
      'non-finite sample',
      (candidate: ReturnType<typeof report>) => {
        candidate.commands.help.samplesMs = [NaN];
      },
    ],
    [
      'non-positive sample',
      (candidate: ReturnType<typeof report>) => {
        candidate.commands.help.samplesMs = [0];
      },
    ],
    [
      'help application load',
      (candidate: ReturnType<typeof report>) => {
        candidate.application.help.applicationLoaderCount = 1;
      },
    ],
    [
      'version application load',
      (candidate: ReturnType<typeof report>) => {
        candidate.application.version.applicationLoaderCount = 1;
      },
    ],
    [
      'non-20 sample count',
      (candidate: ReturnType<typeof report>) => {
        candidate.sampleCount = 19;
      },
    ],
    [
      'incorrect median',
      (candidate: ReturnType<typeof report>) => {
        candidate.commands.help.medianMs += 1;
      },
    ],
    [
      'incorrect p90',
      (candidate: ReturnType<typeof report>) => {
        candidate.commands.help.p90Ms += 1;
      },
    ],
    [
      'unexpected field',
      (candidate: ReturnType<typeof report>) => {
        Object.assign(candidate.commands.help, { thresholdMs: 1 });
      },
    ],
  ])('rejects %s', (_name, mutate) => {
    const candidate = structuredClone(report());
    mutate(candidate);
    expect(() => validateCliColdStartReport(candidate)).toThrow();
  });

  it.each([
    ['nonzero exit', { status: 7, stdout: '', stderr: 'failed' }, /failed/u],
    [
      'stderr output',
      { status: 0, stdout: '{}', stderr: 'warning' },
      /wrote to stderr/u,
    ],
    ['missing status', { status: null, stdout: '', stderr: '' }, /failed/u],
  ])('rejects child %s', (_name, result, error) => {
    expect(() => readCheckedChildResult(result, 'synthetic child')).toThrow(
      error,
    );
  });

  it('rejects malformed child JSON', () => {
    expect(() => parseCheckedJson('{', 'synthetic child')).toThrow(
      /malformed JSON/u,
    );
  });
});
