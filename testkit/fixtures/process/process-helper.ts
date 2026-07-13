import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const scenario = process.argv[2];
const args = process.argv.slice(3);

if (scenario === 'echo-argv') {
  process.stdout.write(JSON.stringify(args));
} else if (scenario === 'env') {
  const inheritedPath = Object.entries(process.env).some(
    ([key, value]) => key.toLowerCase() === 'path' && value !== undefined,
  );
  process.stdout.write(
    JSON.stringify({
      explicit: process.env['REPO_NAV_EXPLICIT'] ?? null,
      leaked: process.env['REPO_NAV_SHOULD_NOT_LEAK'] ?? null,
      inheritedPath,
    }),
  );
} else if (scenario === 'non-zero') {
  process.stderr.write('synthetic failure');
  process.exitCode = 7;
} else if (scenario === 'output') {
  const stream = args[0];
  const size = Number(args[1]);
  const output = Buffer.alloc(size, stream === 'stdout' ? 65 : 66);
  if (stream === 'stdout') {
    process.stdout.write(output);
  } else {
    process.stderr.write(output);
  }
} else if (scenario === 'tree') {
  const pidFile = args[0];
  if (pidFile === undefined) {
    process.exitCode = 2;
  } else {
    const descendant = spawn(
      process.execPath,
      ['-e', "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],
      { stdio: 'ignore', windowsHide: true },
    );
    if (descendant.pid === undefined) {
      process.exitCode = 3;
    } else {
      writeFileSync(
        pidFile,
        JSON.stringify({ parentPid: process.pid, descendantPid: descendant.pid }),
        'utf8',
      );
      const outputStream = args[1];
      const outputSize = Number(args[2]);
      if (
        (outputStream === 'stdout' || outputStream === 'stderr') &&
        Number.isSafeInteger(outputSize) &&
        outputSize > 0
      ) {
        process[outputStream].write(Buffer.alloc(outputSize, 67));
      }
      process.on('SIGTERM', () => {});
      setInterval(() => {}, 1000);
    }
  }
} else if (scenario === 'sleep') {
  setInterval(() => {}, 1000);
} else {
  process.stderr.write('unknown process helper scenario');
  process.exitCode = 2;
}
