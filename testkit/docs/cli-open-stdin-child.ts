import { spawn } from 'node:child_process';

const cliPath = process.argv[2];
if (cliPath === undefined) {
  process.stderr.write('CLI wrapper requires a compiled entrypoint.\n');
  process.exitCode = 2;
} else {
  const child = spawn(process.execPath, [cliPath, ...process.argv.slice(3)], {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.once('error', () => {
    process.stderr.write('CLI wrapper could not start the compiled entrypoint.\n');
    process.exitCode = 1;
  });
  child.once('close', (code, signal) => {
    child.stdin.end();
    if (signal !== null) {
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}
