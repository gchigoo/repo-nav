import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import type { LocateResult } from '../../src/contracts/index.js';

const REPOSITORY_ROOT_PLACEHOLDER = '<REPOSITORY_ROOT>';
const CASE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

export interface ProjectionComparison {
  readonly matches: boolean;
  readonly firstDifferencePath?: string;
}

function expectedPath(caseId: string): string {
  if (!CASE_ID_PATTERN.test(caseId)) {
    throw new Error(`Unsafe Golden case ID: ${caseId}.`);
  }
  return resolve(import.meta.dirname, '..', 'expected', `${caseId}.json`);
}

export function createStableGoldenProjection(result: LocateResult): unknown {
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    evidence: {
      ...result.evidence,
      repositoryRoot: REPOSITORY_ROOT_PLACEHOLDER,
    },
  };
}

export function loadExpectedGoldenProjection(caseId: string): unknown {
  const path = expectedPath(caseId);
  if (!existsSync(path)) {
    throw new Error(`Missing Golden companion snapshot: testkit/expected/${caseId}.json.`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

export function createMissingGoldenProjection(
  caseId: string,
  result: LocateResult,
): boolean {
  if (process.env['REPO_NAV_CREATE_MISSING_GOLDEN'] !== '1') {
    return false;
  }
  const path = expectedPath(caseId);
  if (existsSync(path)) {
    return false;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(createStableGoldenProjection(result), null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
  return true;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstDifference(expected: unknown, actual: unknown, path: string): string {
  if (isDeepStrictEqual(expected, actual)) {
    return path;
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return `${path}.length`;
    }
    for (let index = 0; index < expected.length; index += 1) {
      if (!isDeepStrictEqual(expected[index], actual[index])) {
        return firstDifference(expected[index], actual[index], `${path}[${index}]`);
      }
    }
  }
  if (isRecord(expected) && isRecord(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      if (!isDeepStrictEqual(expected[key], actual[key])) {
        return firstDifference(expected[key], actual[key], `${path}.${key}`);
      }
    }
  }
  return path;
}

export function compareGoldenProjection(
  expected: unknown,
  actualResult: LocateResult,
): ProjectionComparison {
  const actual = createStableGoldenProjection(actualResult);
  return isDeepStrictEqual(expected, actual)
    ? { matches: true }
    : {
        matches: false,
        firstDifferencePath: firstDifference(expected, actual, 'result'),
      };
}
