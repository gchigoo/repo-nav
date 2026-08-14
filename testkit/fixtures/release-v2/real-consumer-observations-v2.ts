import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';

import {
  LocateResultV2Schema,
  type LocateResultV2,
} from '../../../src/contracts/v2/locate-result-v2.js';
import {
  REPO_NAV_LOCATE_TOOL,
  REPO_NAV_LOCATE_TOOL_NAME,
} from '../../../src/mcp/locate-tool-schema.js';
import { readPackageMetadata } from '../../../src/runtime/package-metadata.js';

export interface RealConsumerRepositoryStateV2 {
  readonly branch: string;
  readonly headSha: string;
  readonly indexPath: string;
  readonly indexSha256: string;
  readonly worktreeTreeSha256: string;
  readonly worktreeEntryCount: number;
}

export interface RealConsumerObservationV2 {
  readonly cli: {
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly stdout: string;
    readonly stderr: string;
  };
  readonly mcp: {
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly stdin: string;
    readonly stdout: string;
    readonly stderr: string;
    readonly requests: readonly unknown[];
    readonly frames: readonly unknown[];
  };
  readonly forbiddenScan: {
    readonly violations: readonly string[];
  };
  readonly repository: {
    readonly before: RealConsumerRepositoryStateV2;
    readonly after: RealConsumerRepositoryStateV2;
  };
}

export interface RealConsumerObservationMutationV2 {
  readonly path: readonly string[];
  readonly value: unknown;
}

const packageMetadata = readPackageMetadata();

export const REAL_CONSUMER_CALL_ARGUMENTS_V2 = Object.freeze({
  repoPath: '/tmp/repo-nav-real-consumer',
  terms: Object.freeze(['package.json']),
});

export const REAL_CONSUMER_EXPECTED_CALL_V2 = Object.freeze({
  name: REPO_NAV_LOCATE_TOOL_NAME,
  arguments: REAL_CONSUMER_CALL_ARGUMENTS_V2,
});

export const REAL_CONSUMER_EXPECTED_SERVER_V2 = Object.freeze({
  name: packageMetadata.name,
  version: packageMetadata.version,
  listChanged: false,
  toolDescriptor: REPO_NAV_LOCATE_TOOL,
});

const BASELINE_LOCATE_RESULT_V2 = LocateResultV2Schema.parse({
  ok: true,
  evidence: {
    schemaVersion: '2.0',
    status: 'partial',
    repositoryRef: 'local-repository',
    normalizedTerms: [{ value: 'package.json', caseSensitive: false }],
    confirmed: [],
    candidates: [
      {
        evidenceClass: 'candidate',
        id: 'evidence:v2:0001',
        role: 'reference',
        location: {
          file: 'package.json',
          resolvable: true,
          lines: [1, 2],
          excerpt: '{\n  "name": "repo-nav",\n  "version": "1.1.0"\n}',
        },
        provenance: {
          discoveredBy: ['ripgrep'],
          verifiedBy: 'filesystem',
          operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
        },
        reasonCodes: ['EXACT_TERM_WITHOUT_DIRECT_MAPPING'],
        promotionRequirements: ['USER_SEMANTIC_CONFIRMATION'],
      },
    ],
    coverage: {
      backends: [
        {
          backend: 'ripgrep',
          status: 'used',
          completion: 'incomplete',
          termination: 'early-stop',
          hitCount: 1,
        },
      ],
      strategyComplete: false,
      fallbackChecked: false,
      indexState: 'unknown',
      indexFreshness: 'unknown',
      limitsReached: ['MAX_BACKEND_HITS_REACHED'],
      degradations: ['BACKEND_EARLY_STOPPED'],
      exclusionSummary: {},
      abortSource: 'none',
      unsatisfiedAnchors: [],
      snapshot: {
        gitState: 'clean',
        consistency: 'stable',
        filesChecked: 1,
        discardedEvidenceCount: 0,
      },
      scope: {
        requested: [],
        effective: ['client', 'server', 'db', 'config', 'unknown'],
        policyVersion: 'repo-scope-v1',
        unmatchedLayers: [],
      },
      capabilities: {
        textSearch: 'supported-text-files',
        semanticClassification: ['typescript', 'javascript', 'sql'],
        unsupportedLanguageHits: 0,
      },
    },
    nextActions: [],
  },
});

if (!BASELINE_LOCATE_RESULT_V2.ok) {
  throw new Error('Real-consumer fixture must be a success result.');
}

const ALTERNATE_LOCATE_RESULT_V2 = LocateResultV2Schema.parse({
  ...BASELINE_LOCATE_RESULT_V2,
  evidence: {
    ...BASELINE_LOCATE_RESULT_V2.evidence,
    status: 'ok',
    confirmed: [
      {
        evidenceClass: 'confirmed',
        id: 'evidence:v2:0001',
        role: 'definition',
        location: {
          file: 'package.json',
          resolvable: true,
          lines: [1, 1],
          excerpt: '{ "name": "repo-nav" }',
        },
        provenance: {
          discoveredBy: ['ripgrep'],
          verifiedBy: 'filesystem',
          operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
        },
        reasonCodes: ['EXACT_TERM_MATCH'],
      },
    ],
    candidates: [],
    coverage: {
      ...BASELINE_LOCATE_RESULT_V2.evidence.coverage,
      backends: [
        {
          backend: 'ripgrep',
          status: 'used',
          completion: 'complete',
          termination: 'none',
          hitCount: 1,
        },
      ],
      strategyComplete: true,
      fallbackChecked: true,
      limitsReached: [],
      degradations: [],
    },
  },
});

export const REAL_CONSUMER_LOCATE_RESULT_V2 =
  BASELINE_LOCATE_RESULT_V2 satisfies Extract<
    LocateResultV2,
    { readonly ok: true }
  >;
export const REAL_CONSUMER_LOCATE_RESULT_OTHER_V2 = ALTERNATE_LOCATE_RESULT_V2;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function setAtPath(
  value: unknown,
  path: readonly string[],
  replacement: unknown,
): void {
  if (path.length === 0) {
    const owner = value as Record<string, unknown>;
    for (const key of Object.keys(owner)) {
      delete owner[key];
    }
    Object.assign(owner, clone(replacement));
    return;
  }
  let owner = value as Record<string, unknown>;
  for (const key of path.slice(0, -1)) {
    owner = owner[key] as Record<string, unknown>;
  }
  owner[path.at(-1)!] = replacement;
}

function mcpRequests(callArguments: unknown): readonly unknown[] {
  return [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'repo-nav-e2e', version: '1.0.0' },
      },
    },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: REPO_NAV_LOCATE_TOOL_NAME, arguments: callArguments },
    },
  ];
}

function mcpFrames(locateResult: unknown): readonly unknown[] {
  return [
    {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: packageMetadata.name,
          version: packageMetadata.version,
        },
      },
    },
    {
      jsonrpc: '2.0',
      id: 2,
      result: { tools: [REPO_NAV_LOCATE_TOOL] },
    },
    {
      jsonrpc: '2.0',
      id: 3,
      result: {
        structuredContent: locateResult,
        content: [{ type: 'text', text: JSON.stringify(locateResult) }],
        isError: false,
      },
    },
  ];
}

export function serializeMcpFramesV2(frames: readonly unknown[]): string {
  return `${frames.map((frame) => JSON.stringify(frame)).join('\n')}\n`;
}

const BASELINE_REPOSITORY_STATE_V2: RealConsumerRepositoryStateV2 =
  Object.freeze({
    branch: 'main',
    headSha: '8dd36f093219415442c6f1d144602916f48c3240',
    indexPath: '/tmp/repo-nav-real-consumer/.git/index',
    indexSha256: 'a'.repeat(64),
    worktreeTreeSha256: 'b'.repeat(64),
    worktreeEntryCount: 4,
  });

export function createRealConsumerObservationV2(
  mutations: readonly RealConsumerObservationMutationV2[] = [],
): RealConsumerObservationV2 {
  const cliResult = clone(BASELINE_LOCATE_RESULT_V2);
  const mcpResult = clone(BASELINE_LOCATE_RESULT_V2);
  for (const mutation of mutations) {
    if (mutation.path[0] === 'cliResult') {
      setAtPath(cliResult, mutation.path.slice(1), mutation.value);
    }
    if (mutation.path[0] === 'mcpResult') {
      setAtPath(mcpResult, mutation.path.slice(1), mutation.value);
    }
  }

  const requests = mcpRequests(REAL_CONSUMER_CALL_ARGUMENTS_V2);
  const frames = mcpFrames(mcpResult);
  const observation: RealConsumerObservationV2 = {
    cli: {
      exitCode: 0,
      signal: null,
      stdout: JSON.stringify(cliResult),
      stderr: '',
    },
    mcp: {
      exitCode: 0,
      signal: null,
      stdin: serializeMcpFramesV2(requests),
      stdout: serializeMcpFramesV2(frames),
      stderr: '',
      requests,
      frames,
    },
    forbiddenScan: { violations: [] },
    repository: {
      before: clone(BASELINE_REPOSITORY_STATE_V2),
      after: clone(BASELINE_REPOSITORY_STATE_V2),
    },
  };

  for (const mutation of mutations) {
    if (mutation.path[0] !== 'cliResult' && mutation.path[0] !== 'mcpResult') {
      setAtPath(observation, mutation.path, mutation.value);
    }
  }
  return observation;
}
