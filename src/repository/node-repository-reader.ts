import { Injectable } from '@nestjs/common';

import {
  type EvidenceLocation,
  type NormalizedSearchTerm,
  RepositoryAccessError,
  type RepositoryReader,
  type RepositoryReadLimits,
} from '../contracts/index.js';
import { VerifiedTextFileSourceV2 } from './verified-text-file-source-v2.js';

/**
 * 无状态 one-shot RepositoryReader；安全 open/decode 委托 VerifiedTextFileSourceV2。
 */
@Injectable()
export class NodeRepositoryReader implements RepositoryReader {
  private readonly source = new VerifiedTextFileSourceV2();

  public async resolveRoot(
    repoPath: string,
    signal: AbortSignal,
  ): Promise<string> {
    return this.source.resolveRoot(repoPath, signal);
  }

  public async readRange(
    repositoryRoot: string,
    relativeFile: string,
    lines: readonly [number, number],
    limits: RepositoryReadLimits,
    signal: AbortSignal,
  ): Promise<EvidenceLocation> {
    const file = await this.source.readVerifiedText(
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
    const file = await this.source.readVerifiedText(
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
    const file = await this.source.readVerifiedText(
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
