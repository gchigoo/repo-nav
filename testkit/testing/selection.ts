import { expect } from 'vitest';

export interface TestIdentity {
  readonly group: string;
  readonly caseId: string;
}

function parseSelection(name: string): ReadonlySet<string> {
  const raw = process.env[name];
  if (raw === undefined) {
    return new Set();
  }
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((value): value is string => typeof value === 'string')
  ) {
    throw new Error(`${name} must contain a JSON string array.`);
  }
  return new Set(parsed);
}

export function isSelected(identity: TestIdentity): boolean {
  const groups = parseSelection('REPO_NAV_TEST_GROUPS');
  const cases = parseSelection('REPO_NAV_TEST_CASES');

  return (
    (groups.size === 0 || groups.has(identity.group)) &&
    (cases.size === 0 || cases.has(identity.caseId))
  );
}

export function assertRunnerSurface(expected: string): void {
  expect(process.env['REPO_NAV_TEST_SURFACE']).toBe(expected);
}
