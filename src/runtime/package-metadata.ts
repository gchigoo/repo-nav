/**
 * Bounded package.json name/version loader for runtime serverInfo and CLI --version.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PackageMetadata {
  readonly name: string;
  readonly version: string;
}

/** @deprecated Prefer `PackageMetadata`. */
export type PackageMetadataV1 = PackageMetadata;

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

/**
 * Read bounded name/version from the package root package.json near this module.
 */
export function readPackageMetadata(): PackageMetadata {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/runtime → package root; src/runtime → package root
  const packageRoot = join(here, '..', '..');
  let raw: unknown;
  try {
    raw = JSON.parse(
      readFileSync(join(packageRoot, 'package.json'), 'utf8'),
    ) as unknown;
  } catch {
    throw new Error('Package metadata startup failure.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Package metadata startup failure.');
  }
  const keys = Object.keys(raw);
  if (!keys.includes('name') || !keys.includes('version')) {
    throw new Error('Package metadata startup failure.');
  }
  const name = Reflect.get(raw, 'name');
  const version = Reflect.get(raw, 'version');
  if (
    typeof name !== 'string' ||
    typeof version !== 'string' ||
    !NAME_PATTERN.test(name) ||
    !VERSION_PATTERN.test(version)
  ) {
    throw new Error('Package metadata startup failure.');
  }
  return Object.freeze({ name, version });
}

/**
 * Convenience version probe for MCP serverInfo.
 */
export function readPackageVersionForServer(): string {
  return readPackageMetadata().version;
}
