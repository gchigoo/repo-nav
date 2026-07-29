/**
 * Local audit gate using pinned npm on root production deps.
 * high/critical must be 0; moderate/low dispositions are owner-gated separately.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const npmCli = join(root, 'node_modules/npm/bin/npm-cli.js');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.private !== true) {
  process.stderr.write('private must be true\n');
  process.exit(1);
}

const r = spawnSync(
  process.execPath,
  [npmCli, 'audit', '--omit=dev', '--audit-level=high', '--json'],
  { cwd: root, encoding: 'utf8', shell: false },
);
let report;
try {
  report = JSON.parse(r.stdout || '{}');
} catch {
  process.stderr.write('audit json parse failed\n');
  process.exit(1);
}
const vulns = report.metadata?.vulnerabilities ?? {};
const high = Number(vulns.high ?? 0);
const critical = Number(vulns.critical ?? 0);
if (high > 0 || critical > 0) {
  process.stderr.write(
    `production high/critical must be 0 (high=${high}, critical=${critical})\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      high: 0,
      critical: 0,
      residual:
        'moderate-low-dispositions-and-actual-consumer-audit-pending-owner',
    },
    null,
    2,
  )}\n`,
);
