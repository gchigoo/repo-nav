import { constants } from 'node:fs';
import {
  access,
  open,
  realpath,
  stat,
  type FileHandle,
} from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import {
  RepositoryAccessError,
  type RepositoryReadLimits,
} from '../contracts/index.js';

/**
 * 已通过 containment/open/regular-file/bounded UTF-8 decode 的只读文本快照。
 * S1 仅行为等价抽离；pre/post identity hardening 属于后续 request cache。
 */
export interface VerifiedTextFileV2 {
  readonly relativeFile: string;
  readonly lines: readonly string[];
}

type VerifiedFileOperationV2<T> = (
  handle: FileHandle,
  relativeFile: string,
  fileSize: number,
) => Promise<T>;

const READ_CHUNK_BYTES = 64 * 1024;

/**
 * 仓库内安全文本源：realpath → containment → open → fstat → bounded read → fatal UTF-8。
 * 无请求级状态；cache/snapshot 由上层 adapter 拥有。
 */
export class VerifiedTextFileSourceV2 {
  /**
   * 解析并校验仓库根目录可读。
   */
  public async resolveRoot(
    repoPath: string,
    signal: AbortSignal,
  ): Promise<string> {
    this.assertNotAborted(signal);
    try {
      const repositoryRoot = await realpath(repoPath);
      this.assertNotAborted(signal);
      const rootStat = await stat(repositoryRoot);
      this.assertNotAborted(signal);
      if (!rootStat.isDirectory()) {
        throw new RepositoryAccessError('INVALID_REPOSITORY');
      }
      await access(repositoryRoot, constants.R_OK);
      this.assertNotAborted(signal);
      return repositoryRoot;
    } catch (error: unknown) {
      if (error instanceof RepositoryAccessError) {
        throw error;
      }
      if (signal.aborted) {
        throw new RepositoryAccessError('ABORTED');
      }
      throw new RepositoryAccessError('INVALID_REPOSITORY');
    }
  }

  /**
   * 打开相对路径并解码为行数组（每次调用独立 open/decode）。
   */
  public async readVerifiedText(
    repositoryRoot: string,
    relativeFile: string,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<VerifiedTextFileV2> {
    this.assertValidLimits(limits, relativeFile);
    return await this.withVerifiedFile(
      repositoryRoot,
      relativeFile,
      signal,
      async (handle, canonicalRelativeFile, fileSize) => {
        if (fileSize > limits.maxFileBytes) {
          throw new RepositoryAccessError(
            'MAX_FILE_BYTES_REACHED',
            canonicalRelativeFile,
          );
        }
        const content = await this.readBounded(
          handle,
          canonicalRelativeFile,
          limits.maxFileBytes,
          signal,
        );
        if (content.includes(0)) {
          throw new RepositoryAccessError('BINARY_FILE', canonicalRelativeFile);
        }

        let text: string;
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(content);
        } catch {
          throw new RepositoryAccessError('BINARY_FILE', canonicalRelativeFile);
        }
        this.assertNotAborted(signal, canonicalRelativeFile);
        return {
          relativeFile: canonicalRelativeFile,
          lines: Object.freeze(
            text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n'),
          ),
        };
      },
    );
  }

  /**
   * 在已验证的 regular-file handle 上执行操作后关闭。
   */
  public async withVerifiedFile<T>(
    repositoryRoot: string,
    relativeFile: string,
    signal: AbortSignal,
    operation: VerifiedFileOperationV2<T>,
  ): Promise<T> {
    const canonicalRelativeFile = this.validateRelativeFile(relativeFile);
    this.assertNotAborted(signal, canonicalRelativeFile);

    let resolvedRoot: string;
    try {
      resolvedRoot = await realpath(repositoryRoot);
    } catch {
      throw new RepositoryAccessError('INVALID_REPOSITORY');
    }
    this.assertNotAborted(signal, canonicalRelativeFile);

    const targetPath = resolve(
      resolvedRoot,
      ...canonicalRelativeFile.split('/'),
    );
    let resolvedTarget: string;
    try {
      resolvedTarget = await realpath(targetPath);
    } catch {
      throw new RepositoryAccessError('FILE_UNREADABLE', canonicalRelativeFile);
    }
    this.assertInsideRoot(resolvedRoot, resolvedTarget, canonicalRelativeFile);
    this.assertNotAborted(signal, canonicalRelativeFile);

    let handle: FileHandle | undefined;
    try {
      handle = await open(resolvedTarget, 'r');
      this.assertNotAborted(signal, canonicalRelativeFile);
      const handleStat = await handle.stat();
      this.assertNotAborted(signal, canonicalRelativeFile);
      if (!handleStat.isFile()) {
        throw new RepositoryAccessError(
          'NOT_REGULAR_FILE',
          canonicalRelativeFile,
        );
      }

      const targetAfterOpen = await realpath(targetPath);
      this.assertInsideRoot(
        resolvedRoot,
        targetAfterOpen,
        canonicalRelativeFile,
      );
      this.assertNotAborted(signal, canonicalRelativeFile);
      return await operation(handle, canonicalRelativeFile, handleStat.size);
    } catch (error: unknown) {
      if (error instanceof RepositoryAccessError) {
        throw error;
      }
      if (signal.aborted) {
        throw new RepositoryAccessError('ABORTED', canonicalRelativeFile);
      }
      throw new RepositoryAccessError('FILE_UNREADABLE', canonicalRelativeFile);
    } finally {
      await handle?.close();
    }
  }

  private async readBounded(
    handle: FileHandle,
    relativeFile: string,
    maxFileBytes: number,
    signal: AbortSignal,
  ): Promise<Uint8Array> {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    while (totalBytes <= maxFileBytes) {
      this.assertNotAborted(signal, relativeFile);
      const remaining = maxFileBytes + 1 - totalBytes;
      const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, remaining));
      const { bytesRead } = await handle.read(
        chunk,
        0,
        chunk.byteLength,
        totalBytes,
      );
      this.assertNotAborted(signal, relativeFile);
      if (bytesRead === 0) {
        break;
      }
      chunks.push(chunk.subarray(0, bytesRead));
      totalBytes += bytesRead;
    }

    if (totalBytes > maxFileBytes) {
      throw new RepositoryAccessError('MAX_FILE_BYTES_REACHED', relativeFile);
    }
    return Buffer.concat(chunks, totalBytes);
  }

  private validateRelativeFile(relativeFile: string): string {
    const absoluteInput =
      posix.isAbsolute(relativeFile) || isAbsolute(relativeFile);
    if (
      relativeFile.length === 0 ||
      relativeFile.includes('\\') ||
      absoluteInput ||
      posix.normalize(relativeFile) !== relativeFile ||
      relativeFile === '..' ||
      relativeFile.startsWith('../')
    ) {
      // Absolute inputs must not reappear on typed errors (F4-PATH-004).
      throw new RepositoryAccessError(
        'INVALID_RELATIVE_PATH',
        absoluteInput || relativeFile.length === 0 ? undefined : relativeFile,
      );
    }
    return relativeFile;
  }

  private assertInsideRoot(
    repositoryRoot: string,
    targetPath: string,
    relativeFile: string,
  ): void {
    const pathFromRoot = relative(repositoryRoot, targetPath);
    if (
      pathFromRoot === '..' ||
      pathFromRoot.startsWith(`..${sep}`) ||
      isAbsolute(pathFromRoot)
    ) {
      throw new RepositoryAccessError('PATH_OUTSIDE_ROOT', relativeFile);
    }
  }

  private assertValidLimits(
    limits: RepositoryReadLimits,
    relativeFile: string,
  ): void {
    if (
      !Number.isSafeInteger(limits.maxFileBytes) ||
      !Number.isSafeInteger(limits.maxExcerptBytes) ||
      !Number.isSafeInteger(limits.maxExcerptLines) ||
      limits.maxFileBytes < 1 ||
      limits.maxExcerptBytes < 1 ||
      limits.maxExcerptLines < 1
    ) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', relativeFile);
    }
  }

  private assertNotAborted(
    signal: AbortSignal,
    relativeFile?: string,
  ): void {
    if (signal.aborted) {
      throw new RepositoryAccessError('ABORTED', relativeFile);
    }
  }
}
