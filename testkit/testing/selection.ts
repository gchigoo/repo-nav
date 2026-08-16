import { expect } from 'vitest';

export interface TestIdentity {
  readonly group: string;
  readonly caseId: string;
}

const IDENTITY_KEY_SEPARATOR = '\u0000';

function identityKey(identity: TestIdentity): string {
  return `${identity.group}${IDENTITY_KEY_SEPARATOR}${identity.caseId}`;
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

function isTestIdentity(value: unknown): value is TestIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  return (
    keys.length === 2 &&
    typeof record['group'] === 'string' &&
    record['group'].length > 0 &&
    typeof record['caseId'] === 'string' &&
    record['caseId'].length > 0
  );
}

function parseIdentitySelection(): ReadonlySet<string> | null {
  const raw = process.env['REPO_NAV_TEST_IDENTITIES'];
  if (raw === undefined) {
    return new Set();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || !parsed.every(isTestIdentity)) {
    return null;
  }

  return new Set(parsed.map((value) => identityKey(value)));
}

export function isExplicitlySelected(identity: TestIdentity): boolean {
  const identities = parseIdentitySelection();
  if (identities === null) {
    return false;
  }
  if (identities.size > 0) {
    return identities.has(identityKey(identity));
  }

  const groups = parseSelection('REPO_NAV_TEST_GROUPS');
  return groups.size > 0 && groups.has(identity.group);
}

export function isSelected(identity: TestIdentity): boolean {
  if (isExplicitlySelected(identity)) {
    return true;
  }

  const identities = parseIdentitySelection();
  if (identities === null || identities.size > 0) {
    return false;
  }
  return parseSelection('REPO_NAV_TEST_GROUPS').size === 0;
}

export function assertRunnerSurface(expected: string): void {
  expect(process.env['REPO_NAV_TEST_SURFACE']).toBe(expected);
}
