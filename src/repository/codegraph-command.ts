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
    return Object.freeze({ executable: 'codegraph', argv: Object.freeze([...argv]) });
  }

  for (const directory of (process.env['PATH'] ?? '').split(delimiter)) {
    if (directory.length === 0 || !existsSync(resolve(directory, 'codegraph.cmd'))) {
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

    const npmShim = resolve(
      dirname(resolve(directory, 'codegraph.cmd')),
      'node_modules',
      '@colbymchenry',
      'codegraph',
      'npm-shim.js',
    );
    if (existsSync(npmShim)) {
      const siblingNode = resolve(directory, 'node.exe');
      return Object.freeze({
        executable: existsSync(siblingNode) ? siblingNode : process.execPath,
        argv: Object.freeze([npmShim, ...argv]),
      });
    }
  }

  return Object.freeze({ executable: 'codegraph', argv: Object.freeze([...argv]) });
}
