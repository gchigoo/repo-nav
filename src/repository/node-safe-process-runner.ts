import type { ChildProcess } from 'node:child_process';

import { Injectable } from '@nestjs/common';

import type {
  SafeProcessRequest,
  SafeProcessResult,
  SafeProcessStreamingResultV2,
  SafeStdoutConsumerV2,
  StreamingSafeProcessRunnerV2,
} from '../contracts/index.js';
import { BoundedByteCollectorV2 } from '../process/bounded-byte-collector-v2.js';
import { projectBufferedCompatibilityResultV2 } from '../process/buffered-compatibility-projection-v2.js';
import {
  defaultTerminateProcessTreeV2,
  SafeProcessExecutionKernelV2,
} from '../process/safe-process-execution-kernel-v2.js';

/**
 * Nest-facing safe process runner：buffered / streaming 共用唯一 kernel。
 */
@Injectable()
export class NodeSafeProcessRunner implements StreamingSafeProcessRunnerV2 {
  protected terminateProcessTree(pid: number, force: boolean): Promise<void> {
    return defaultTerminateProcessTreeV2(pid, force);
  }

  protected killDirectChild(child: ChildProcess): void {
    child.kill('SIGKILL');
  }

  private createKernel(): SafeProcessExecutionKernelV2 {
    return new SafeProcessExecutionKernelV2({
      terminateProcessTree: (pid, force) =>
        this.terminateProcessTree(pid, force),
      killDirectChild: (child) => this.killDirectChild(child),
    });
  }

  public async run(
    request: SafeProcessRequest,
    signal: AbortSignal,
  ): Promise<SafeProcessResult> {
    const collector = new BoundedByteCollectorV2();
    const streaming = await this.createKernel().runStreaming(
      request,
      signal,
      collector,
    );
    // process-exit 在 streaming 丢弃 stdout；buffered 仍保留 collector 有界 bytes
    if (!streaming.ok && streaming.kind === 'process-exit') {
      const collected = collector.partial();
      return {
        ok: false,
        kind: 'non-zero-exit',
        exitCode: streaming.exitCode,
        terminationSignal: streaming.terminationSignal,
        stdout: collected.ok ? collected.value : new Uint8Array(),
        stderr: streaming.stderr,
      };
    }
    return projectBufferedCompatibilityResultV2(streaming);
  }

  public runStreaming<TPartial, TComplete>(
    request: SafeProcessRequest,
    signal: AbortSignal,
    consumer: SafeStdoutConsumerV2<TPartial, TComplete>,
  ): Promise<SafeProcessStreamingResultV2<TPartial, TComplete>> {
    return this.createKernel().runStreaming(request, signal, consumer);
  }
}
