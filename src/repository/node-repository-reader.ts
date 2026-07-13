import { constants } from 'node:fs';
import {
  access,
  open,
  realpath,
  stat,
  type FileHandle,
} from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  type EvidenceLocation,
  type NormalizedSearchTerm,
  RepositoryAccessError,
  type RepositoryReader,
  type RepositoryReadLimits,
} from '../contracts/index.js';

interface VerifiedTextFile {
  readonly relativeFile: string;
  readonly lines: readonly string[];
}

type VerifiedFileOperation<T> = (
  handle: FileHandle,
  canonicalRelativeFile: string,
  fileSize: number,
) => Promise<T>;

const READ_CHUNK_BYTES = 64 * 1024;

@Injectable()
export class NodeRepositoryReader implements RepositoryReader {
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

  public async readRange(
    repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    const file = await this.readVerifiedText(
      repositoryRoot,
      relativeFile,
      limits,
      signal,
    );
    const [start, end] = lines;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start ||
      end > file.lines.length
    ) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', file.relativeFile);
    }
    if (end - start + 1 > limits.maxExcerptLines) {
      throw new RepositoryAccessError(
        'MAX_EXCERPT_BYTES_REACHED',
        file.relativeFile,
      );
    }

    const excerpt = file.lines.slice(start - 1, end).join('\n');
    if (excerpt.length === 0) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', file.relativeFile);
    }
    this.assertExcerptWithinLimit(excerpt, file.relativeFile, limits);
    this.assertNotAborted(signal, file.relativeFile);
    return {
      file: file.relativeFile,
      lines: [start, end],
      excerpt,
    };
  }

  public async readWindow(
    repositoryRoot: string,
    relativeFile: string,
    focusLines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    const file = await this.readVerifiedText(
      repositoryRoot,
      relativeFile,
      limits,
      signal,
    );
    const [focusStart, focusEnd] = focusLines;
    const focusLength = focusEnd - focusStart + 1;
    if (
      !Number.isSafeInteger(focusStart) ||
      !Number.isSafeInteger(focusEnd) ||
      focusStart < 1 ||
      focusEnd < focusStart ||
      focusEnd > file.lines.length ||
      focusLength > limits.maxExcerptLines
    ) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', file.relativeFile);
    }

    const available = limits.maxExcerptLines - focusLength;
    let start = Math.max(1, focusStart - Math.ceil(available / 2));
    let end = Math.min(file.lines.length, start + limits.maxExcerptLines - 1);
    start = Math.max(1, end - limits.maxExcerptLines + 1);

    let excerpt = file.lines.slice(start - 1, end).join('\n');
    while (
      Buffer.byteLength(excerpt, 'utf8') > limits.maxExcerptBytes &&
      (start < focusStart || end > focusEnd)
    ) {
      const before = focusStart - start;
      const after = end - focusEnd;
      if (before >= after && start < focusStart) {
        start += 1;
      } else if (end > focusEnd) {
        end -= 1;
      }
      excerpt = file.lines.slice(start - 1, end).join('\n');
    }

    if (excerpt.length === 0) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', file.relativeFile);
    }
    this.assertExcerptWithinLimit(excerpt, file.relativeFile, limits);
    this.assertNotAborted(signal, file.relativeFile);
    return {
      file: file.relativeFile,
      lines: [start, end],
      excerpt,
    };
  }

  public async findMatches(
    repositoryRoot: string,
    relativeFile: string,
    terms: readonly NormalizedSearchTerm[],
    symbol: string | undefined,
    maxMatches: number,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<readonly EvidenceLocation[]> {
    if (!Number.isSafeInteger(maxMatches) || maxMatches < 1) {
      throw new RepositoryAccessError('INVALID_LINE_RANGE', relativeFile);
    }
    const file = await this.readVerifiedText(
      repositoryRoot,
      relativeFile,
      limits,
      signal,
    );
    const matches: EvidenceLocation[] = [];

    for (let index = 0; index < file.lines.length; index += 1) {
      this.assertNotAborted(signal, file.relativeFile);
      const excerpt = file.lines[index] ?? '';
      const symbolMatches = symbol !== undefined && excerpt.includes(symbol);
      const termMatches = terms.some((term) =>
        term.caseSensitive
          ? excerpt.includes(term.value)
          : excerpt.toLocaleLowerCase('und').includes(
              term.value.toLocaleLowerCase('und'),
            ),
      );
      if (!symbolMatches && !termMatches) {
        continue;
      }

      this.assertExcerptWithinLimit(excerpt, file.relativeFile, limits);
      matches.push({
        file: file.relativeFile,
        symbol,
        lines: [index + 1, index + 1],
        excerpt,
      });
      if (matches.length >= maxMatches) {
        break;
      }
    }

    this.assertNotAborted(signal, file.relativeFile);
    return Object.freeze(matches);
  }

  private async readVerifiedText(
    repositoryRoot: string,
    relativeFile: string,
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<VerifiedTextFile> {
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

  private async withVerifiedFile<T>(
    repositoryRoot: string,
    relativeFile: string,
    signal: AbortSignal,
    operation: VerifiedFileOperation<T>,
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

  private validateRelativeFile(relativeFile: string): string {
    if (
      relativeFile.length === 0 ||
      relativeFile.includes('\\') ||
      posix.isAbsolute(relativeFile) ||
      isAbsolute(relativeFile) ||
      posix.normalize(relativeFile) !== relativeFile ||
      relativeFile === '..' ||
      relativeFile.startsWith('../')
    ) {
      throw new RepositoryAccessError(
        'INVALID_RELATIVE_PATH',
        relativeFile.length === 0 ? undefined : relativeFile,
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

  private assertExcerptWithinLimit(
    excerpt: string,
    relativeFile: string,
    limits: RepositoryReadLimits,
  ): void {
    if (Buffer.byteLength(excerpt, 'utf8') > limits.maxExcerptBytes) {
      throw new RepositoryAccessError(
        'MAX_EXCERPT_BYTES_REACHED',
        relativeFile,
      );
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
