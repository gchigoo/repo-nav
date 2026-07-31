/**
 * GA real-repo benchmark gate: runs the TS runner under tsx and fails closed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(moduleDirectory, '..', '..');
const runnerPath = resolve(
  repositoryRoot,
  'tools/benchmark/real-repo-benchmark-runner.ts',
);

if (!existsSync(runnerPath)) {
  process.stderr.write(`missing runner: ${runnerPath}\n`);
  process.exit(1);
}

if (process.env['REPO_NAV_BENCHMARK_TSX_ACTIVE'] !== '1') {
  const relaunch = spawnSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url)],
    {
      cwd: repositoryRoot,
      env: { ...process.env, REPO_NAV_BENCHMARK_TSX_ACTIVE: '1' },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  process.exit(relaunch.status ?? 1);
}

const { runRealRepoBenchmark } = await import(pathToFileURL(runnerPath).href);
const summary = await runRealRepoBenchmark(repositoryRoot);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.exit(summary.ok ? 0 : 1);
