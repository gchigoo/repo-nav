#!/usr/bin/env node

import { executeCli } from './execute.js';

const controller = new AbortController();
const abort = (): void => {
  controller.abort();
};
process.once('SIGINT', abort);
process.once('SIGTERM', abort);

const cliArgs = process.argv.slice(2);

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
}
