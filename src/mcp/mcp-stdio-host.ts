import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import {
  LocateRequestSchema,
  resolveLocateLimits,
  type LocateRequest,
  type RepositoryEvidenceService,
} from '../contracts/index.js';
import { REPOSITORY_EVIDENCE_SERVICE } from '../runtime/tokens.js';
import {
  internalLocateError,
  invalidLocateInput,
  serializeLocateToolOutput,
} from './locate-tool-output.js';
import { createRepoNavMcpServer } from './repo-nav-mcp-server.js';

export type McpShutdownReason =
  | 'eof'
  | 'signal'
  | 'transport-error'
  | 'bootstrap-error';

export interface McpStdioHost {
  connect(): Promise<void>;
  close(reason: McpShutdownReason): Promise<void>;
  setTransportErrorHandler(handler: () => void): void;
}

type HostState = 'idle' | 'connecting' | 'running' | 'closing' | 'closed';

interface TrackedLocateCall {
  readonly controller: AbortController;
  readonly settled: Promise<void>;
  settle(): void;
}

function createTrackedCall(): TrackedLocateCall {
  let settlePromise: (() => void) | undefined;
  const settled = new Promise<void>((resolve) => {
    settlePromise = resolve;
  });
  return {
    controller: new AbortController(),
    settled,
    settle: () => settlePromise?.(),
  };
}

@Injectable()
export class NodeMcpStdioHost implements McpStdioHost, OnModuleDestroy {
  private readonly server: Server;
  private readonly shutdownController = new AbortController();
  private readonly trackedCalls = new Set<TrackedLocateCall>();
  private state: HostState = 'idle';
  private connectPromise: Promise<void> | undefined;
  private closePromise: Promise<void> | undefined;
  private shutdownReason: McpShutdownReason | undefined;
  private transportErrorHandler: (() => void) | undefined;

  public constructor(
    @Inject(REPOSITORY_EVIDENCE_SERVICE)
    private readonly evidenceService: RepositoryEvidenceService,
  ) {
    this.server = createRepoNavMcpServer(
      async (argumentsValue, signal) =>
        await this.handleLocate(argumentsValue, signal),
    );
    this.server.onerror = () => {
      this.transportErrorHandler?.();
    };
  }

  public setTransportErrorHandler(handler: () => void): void {
    if (this.transportErrorHandler !== undefined) {
      throw new Error('MCP transport error handler can only be set once.');
    }
    this.transportErrorHandler = handler;
  }

  public connect(): Promise<void> {
    if (this.state !== 'idle') {
      return Promise.reject(
        new Error('MCP stdio host can only connect once.'),
      );
    }
    this.state = 'connecting';
    this.connectPromise = this.performConnect();
    return this.connectPromise;
  }

  private async performConnect(): Promise<void> {
    try {
      await this.server.connect(new StdioServerTransport());
      if (this.state === 'connecting') {
        this.state = 'running';
      }
    } catch (error: unknown) {
      if (this.state === 'connecting') {
        this.state = 'closed';
      }
      throw error;
    }
  }

  public close(reason: McpShutdownReason): Promise<void> {
    if (this.closePromise !== undefined) {
      return this.closePromise;
    }
    this.shutdownReason = reason;
    this.state = 'closing';
    this.closePromise = this.performClose();
    return this.closePromise;
  }

  public async onModuleDestroy(): Promise<void> {
    await this.close(this.shutdownReason ?? 'bootstrap-error');
  }

  private async handleLocate(
    argumentsValue: Readonly<Record<string, unknown>> | undefined,
    sdkSignal: AbortSignal,
  ): Promise<CallToolResult> {
    if (this.state === 'closing' || this.state === 'closed') {
      return serializeLocateToolOutput(internalLocateError());
    }
    const parsed = LocateRequestSchema.safeParse(argumentsValue);
    if (!parsed.success) {
      return serializeLocateToolOutput(
        invalidLocateInput(this.requiresAdditionalTerm(argumentsValue)),
      );
    }
    return await this.executeTrackedLocate(parsed.data, sdkSignal);
  }

  private requiresAdditionalTerm(
    argumentsValue: Readonly<Record<string, unknown>> | undefined,
  ): boolean {
    const terms = argumentsValue?.terms;
    return (
      !Array.isArray(terms) ||
      terms.length === 0 ||
      terms.some(
        (term) =>
          typeof term !== 'string' || term.normalize('NFKC').trim().length === 0,
      )
    );
  }

  private async executeTrackedLocate(
    request: LocateRequest,
    sdkSignal: AbortSignal,
  ): Promise<CallToolResult> {
    const tracked = createTrackedCall();
    this.trackedCalls.add(tracked);
    const abort = (): void => {
      if (!tracked.controller.signal.aborted) {
        tracked.controller.abort();
      }
    };
    sdkSignal.addEventListener('abort', abort, { once: true });
    this.shutdownController.signal.addEventListener('abort', abort, {
      once: true,
    });
    if (sdkSignal.aborted || this.shutdownController.signal.aborted) {
      abort();
    }
    const timeout = setTimeout(abort, resolveLocateLimits(request.limits).timeoutMs);

    try {
      const result = await this.evidenceService.locate(request, {
        signal: tracked.controller.signal,
      });
      return serializeLocateToolOutput(result);
    } catch {
      return serializeLocateToolOutput(internalLocateError());
    } finally {
      clearTimeout(timeout);
      sdkSignal.removeEventListener('abort', abort);
      this.shutdownController.signal.removeEventListener('abort', abort);
      tracked.settle();
      this.trackedCalls.delete(tracked);
    }
  }

  private async performClose(): Promise<void> {
    this.shutdownController.abort();
    for (const tracked of this.trackedCalls) {
      if (!tracked.controller.signal.aborted) {
        tracked.controller.abort();
      }
    }
    if (this.connectPromise !== undefined) {
      await Promise.allSettled([this.connectPromise]);
    }
    const serverResultPromise = Promise.resolve()
      .then(async () => {
        await this.server.close();
      })
      .then(
        () => ({ status: 'fulfilled' as const }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      );
    await Promise.allSettled(
      [...this.trackedCalls].map(async (tracked) => await tracked.settled),
    );
    this.state = 'closed';
    const serverResult = await serverResultPromise;
    if (serverResult.status === 'rejected') {
      throw new Error('MCP stdio host close failed.', {
        cause: serverResult.reason,
      });
    }
  }
}
