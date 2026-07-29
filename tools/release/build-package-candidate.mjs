/**
 * Fresh source→emit package candidate builder (delegates clean + pack-candidate).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');

function run(args) {
  const r = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (r.status !== 0) {
    process.stderr.write(
      r.stderr || r.stdout || 'build-package-candidate failed\n',
    );
    process.exit(r.status ?? 1);
  }
  return r.stdout;
}

run(['run', 'build']);
const smoke = spawnSync(
  process.execPath,
  [join(root, 'tools/release/pack-candidate.mjs'), '--smoke'],
  { cwd: root, encoding: 'utf8', shell: false },
);
if (smoke.status !== 0) {
  process.stderr.write(smoke.stderr || smoke.stdout || 'pack smoke failed\n');
  process.exit(smoke.status ?? 1);
}
process.stdout.write(
  `${JSON.stringify({ ok: true, builder: 'build-package-candidate', smokeExit: 0 }, null, 2)}\n`,
);
