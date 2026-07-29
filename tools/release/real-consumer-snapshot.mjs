/**
 * Full-worktree before/after snapshot helpers for real-consumer E2E.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function walkFiles(absRoot, absDir, out) {
  for (const name of readdirSync(absDir)) {
    if (name === '.git' || name === 'node_modules' || name === 'dist') continue;
    const abs = join(absDir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walkFiles(absRoot, abs, out);
      continue;
    }
    const rel = relative(absRoot, abs).replace(/\\/gu, '/');
    out.push(rel);
  }
}

/**
 * Capture sorted path list + content hashes for a repository tree.
 */
export function captureWorktreeSnapshot(repositoryRoot) {
  const files = [];
  walkFiles(repositoryRoot, repositoryRoot, files);
  files.sort((a, b) => a.localeCompare(b));
  const entries = files.map((rel) => {
    const bytes = readFileSync(join(repositoryRoot, rel));
    return {
      path: rel,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.length,
    };
  });
  const treeSha256 = createHash('sha256')
    .update(JSON.stringify(entries))
    .digest('hex');
  return { entries, treeSha256 };
}

/**
 * Resolve git index path via path-format=absolute authority.
 */
export function resolveGitIndexAbsolute(repositoryRoot) {
  const r = spawnSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-path', 'index'],
    { cwd: repositoryRoot, encoding: 'utf8', shell: false },
  );
  if (r.status !== 0) {
    throw new Error(`git index resolve failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

/**
 * Assert before/after snapshots are deep-exact.
 */
export function assertSnapshotUnchanged(before, after) {
  if (before.treeSha256 !== after.treeSha256) {
    throw new Error('worktree before/after snapshot mismatch');
  }
}
