/**
 * ReleaseDesignRevisionV1: raw-byte hash of F9 design + checklist tuple.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const RELEASE_DESIGN_REVISION_PATHS_V1 = Object.freeze([
  '.codestable/features/2026-07-24-public-beta-release/public-beta-release-design.md',
  '.codestable/features/2026-07-24-public-beta-release/public-beta-release-checklist.yaml',
]);

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function sha256Raw(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function strictCompact(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(strictCompact).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${strictCompact(value[k])}`).join(',')}}`;
}

/**
 * Compute ReleaseDesignRevisionV1 from working-tree raw bytes.
 */
export function computeReleaseDesignRevisionV1(options = {}) {
  const requireClean = options.requireClean === true;
  const entries = RELEASE_DESIGN_REVISION_PATHS_V1.map((rel) => {
    if (requireClean) {
      const status = execFileSync(
        'git',
        ['status', '--porcelain=v1', '--', rel],
        { cwd: root, encoding: 'utf8' },
      ).trim();
      if (status !== '') {
        throw new Error(`Design revision path dirty or untracked: ${rel}`);
      }
    }
    const buf = readFileSync(join(root, rel));
    return Object.freeze({
      path: rel,
      byteLength: buf.byteLength,
      sha256: sha256Raw(buf),
    });
  });
  const body = {
    schemaVersion: 1,
    algorithm: 'sha256-raw-bytes-v1',
    entries,
  };
  const designRevisionSha256 = sha256Raw(
    Buffer.from(strictCompact(body), 'utf8'),
  );
  return Object.freeze({ ...body, designRevisionSha256 });
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('design-revision.mjs')
) {
  process.stdout.write(
    `${JSON.stringify(computeReleaseDesignRevisionV1(), null, 2)}\n`,
  );
}
