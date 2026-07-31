import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export interface PlatformPathTree {
  readonly workspace: string;
  readonly repository: string;
  readonly outside: string;
  cleanup(): void;
}

/**
 * Creates a real temp repository tree for path/symlink/junction contracts.
 */
export function createPlatformPathTree(
  prefix = 'repo-nav-platform-path-',
): PlatformPathTree {
  const workspace = mkdtempSync(resolve(tmpdir(), prefix));
  const repository = resolve(workspace, 'repository');
  const outside = resolve(workspace, 'outside');
  mkdirSync(repository);
  mkdirSync(outside);
  mkdirSync(resolve(repository, 'folder'));
  writeFileSync(resolve(repository, 'inside.txt'), 'inside', 'utf8');
  writeFileSync(resolve(outside, 'secret.txt'), 'outside secret', 'utf8');
  return {
    workspace,
    repository,
    outside,
    cleanup(): void {
      rmSync(workspace, { recursive: true, force: true });
    },
  };
}

/**
 * Creates a POSIX directory symlink escape under repository/escape.
 */
export function createPosixSymlinkEscape(tree: PlatformPathTree): void {
  if (process.platform === 'win32') {
    throw new Error('POSIX symlink escape requires linux/darwin');
  }
  symlinkSync(tree.outside, resolve(tree.repository, 'escape'), 'dir');
}

/**
 * Creates a Windows directory junction escape under repository/escape.
 */
export function createWindowsReparseEscape(tree: PlatformPathTree): void {
  if (process.platform !== 'win32') {
    throw new Error('Windows reparse escape requires win32');
  }
  symlinkSync(tree.outside, resolve(tree.repository, 'escape'), 'junction');
}
