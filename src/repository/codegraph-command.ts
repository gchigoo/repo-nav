import { existsSync } from 'node:fs';
import { delimiter, dirname, resolve } from 'node:path';

export interface CodeGraphProcessInvocation {
  readonly executable: string;
  readonly argv: readonly string[];
}

export function createCodeGraphProcessInvocation(
  argv: readonly string[],
): CodeGraphProcessInvocation {
  if (process.platform !== 'win32') {
    return Object.freeze({
      executable: 'codegraph',
      argv: Object.freeze([...argv]),
    });
  }

  for (const directory of (process.env['PATH'] ?? '').split(delimiter)) {
    if (
      directory.length === 0 ||
      !existsSync(resolve(directory, 'codegraph.cmd'))
    ) {
      continue;
    }

    const portableRoot = resolve(directory, '..');
    const portableNode = resolve(portableRoot, 'node.exe');
    const portableScript = resolve(
      portableRoot,
      'lib',
      'dist',
      'bin',
      'codegraph.js',
    );
    if (existsSync(portableNode) && existsSync(portableScript)) {
      return Object.freeze({
        executable: portableNode,
        argv: Object.freeze(['--liftoff-only', portableScript, ...argv]),
      });
    }

    const shimDirectory = dirname(resolve(directory, 'codegraph.cmd'));
    const npmShimCandidates = [
      // Global Node install: shims live next to node.exe / node_modules.
      resolve(
        shimDirectory,
        'node_modules',
        '@colbymchenry',
        'codegraph',
        'npm-shim.js',
      ),
      // npm --prefix / local install: shims live in node_modules/.bin.
      resolve(shimDirectory, '..', '@colbymchenry', 'codegraph', 'npm-shim.js'),
    ];
    for (const npmShim of npmShimCandidates) {
      if (!existsSync(npmShim)) {
        continue;
      }
      const siblingNode = resolve(directory, 'node.exe');
      return Object.freeze({
        executable: existsSync(siblingNode) ? siblingNode : process.execPath,
        argv: Object.freeze([npmShim, ...argv]),
      });
    }
  }

  return Object.freeze({
    executable: 'codegraph',
    argv: Object.freeze([...argv]),
  });
}
