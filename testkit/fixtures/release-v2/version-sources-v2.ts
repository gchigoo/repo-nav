import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPkg = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'),
    'utf8',
  ),
) as { version: string };

/** Sole version authority: package.json (kept in sync by release bumps). */
export const EXPECTED_PACKAGE_VERSION_V2 = rootPkg.version;
