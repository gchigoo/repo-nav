#!/usr/bin/env node

import { executeCli } from './execute.js';

const controller = new AbortController();
const abort = (): void => {
  controller.abort();
};
process.once('SIGINT', abort);
process.once('SIGTERM', abort);

let watchingStdin = false;
const cliArgs = process.argv.slice(2);
const isContextCommand =
  cliArgs[0] === 'debug' && (cliArgs[1] === 'locate' || cliArgs[1] === 'probe');
if (isContextCommand && !process.stdin.isTTY && !process.stdin.readableEnded) {
  watchingStdin = true;
  process.stdin.once('end', abort);
  process.stdin.resume();
}

try {
  const result = await executeCli(cliArgs, controller.signal);
  // locate already includes trailing newline on compact JSON; help/version/probe may not
  const stdout =
    result.stdout.endsWith('\n') || result.stdout.length === 0
      ? result.stdout
      : `${result.stdout}\n`;
  process.stdout.write(stdout);
  if (result.stderr !== undefined) {
    process.stderr.write(`${result.stderr}\n`);
  }
  process.exitCode = result.exitCode;
} finally {
  process.removeListener('SIGINT', abort);
  process.removeListener('SIGTERM', abort);
  if (watchingStdin) {
    process.stdin.removeListener('end', abort);
    process.stdin.pause();
  }
}
