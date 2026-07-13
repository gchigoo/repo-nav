#!/usr/bin/env node

import { executeCli } from './execute.js';

const controller = new AbortController();
const abort = (): void => controller.abort();
process.once('SIGINT', abort);
process.once('SIGTERM', abort);

let watchingStdin = false;
const cliArgs = process.argv.slice(2);
const isContextCommand =
  cliArgs[0] === 'debug' &&
  (cliArgs[1] === 'locate' || cliArgs[1] === 'probe');
if (isContextCommand && !process.stdin.isTTY && !process.stdin.readableEnded) {
  watchingStdin = true;
  process.stdin.once('end', abort);
  process.stdin.resume();
}

try {
  const result = await executeCli(cliArgs, controller.signal);
  process.stdout.write(`${result.stdout}\n`);
  if (result.stderr !== undefined) process.stderr.write(`${result.stderr}\n`);
  process.exitCode = result.exitCode;
} finally {
  process.removeListener('SIGINT', abort);
  process.removeListener('SIGTERM', abort);
  if (watchingStdin) {
    process.stdin.removeListener('end', abort);
    process.stdin.pause();
  }
}
