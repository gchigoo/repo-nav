import { isDeepStrictEqual } from 'node:util';

import { assertRepositoryStateUnchanged } from './real-consumer-snapshot.mjs';

let locateResultSchema = null;

export async function reloadLocateResultSchema(specifier) {
  const resolved =
    specifier ??
    new URL('../../dist/contracts/v2/locate-result-v2.js', import.meta.url);
  try {
    const module = await import(resolved.href ?? resolved);
    locateResultSchema = module.LocateResultV2Schema ?? null;
  } catch {
    locateResultSchema = null;
  }
  return locateResultSchema !== null;
}

export function reloadLocateResultSchemaFromSource() {
  return reloadLocateResultSchema(
    new URL('../../src/contracts/v2/locate-result-v2.js', import.meta.url),
  );
}

export function isLocateResultSchemaAvailable() {
  return locateResultSchema !== null;
}

export const REAL_CONSUMER_FAILURE_CODES = Object.freeze([
  'cli-nonzero-exit',
  'cli-signal-exit',
  'cli-stderr-not-empty',
  'cli-json-invalid',
  'locate-ok-false',
  'locate-schema-mismatch',
  'locate-cancelled',
  'locate-timeout',
  'locate-evidence-insufficient',
  'locate-schema-unavailable',
  'mcp-authority-missing',
  'mcp-result-invalid',
  'mcp-stdout-protocol-invalid',
  'mcp-stderr-not-empty',
  'mcp-cli-parity-mismatch',
  'unmeasured-attestation',
  'forbidden-output-detected',
  'repository-state-changed',
]);

const OBSERVATION_KEYS = new Set(['cli', 'mcp', 'forbiddenScan', 'repository']);
const CLI_KEYS = new Set(['exitCode', 'signal', 'stdout', 'stderr']);
const MCP_KEYS = new Set([
  'exitCode',
  'signal',
  'stdin',
  'stdout',
  'stderr',
  'requests',
  'frames',
]);
const FORBIDDEN_SCAN_KEYS = new Set(['violations']);
const REPOSITORY_KEYS = new Set(['before', 'after']);
const REPOSITORY_STATE_KEYS = new Set([
  'branch',
  'headSha',
  'indexPath',
  'indexSha256',
  'worktreeTreeSha256',
  'worktreeEntryCount',
]);
const SECRET_LIKE_PATTERNS = [
  /\b(?:ghp|github_pat)_[0-9A-Za-z_]{20,}\b/gu,
  /\bAKIA[0-9A-Z]{16}\b/gu,
  /\b(?:api[_-]?key|password|passwd|token|client[_-]?secret)\s*[:=]\s*[^\s,;]{8,}/giu,
];
const REQUEST_KEYS = new Set(['jsonrpc', 'id', 'method', 'params']);
const INITIALIZE_PARAMS_KEYS = new Set([
  'protocolVersion',
  'capabilities',
  'clientInfo',
]);
const CLIENT_INFO_KEYS = new Set(['name', 'version']);
const CALL_PARAMS_KEYS = new Set(['name', 'arguments']);
const CALL_ARGUMENT_KEYS = new Set(['repoPath', 'terms']);
const RESPONSE_KEYS = new Set(['jsonrpc', 'id', 'result']);
const INITIALIZE_RESULT_KEYS = new Set([
  'protocolVersion',
  'capabilities',
  'serverInfo',
]);
const CAPABILITIES_KEYS = new Set(['tools']);
const TOOLS_CAPABILITY_KEYS = new Set(['listChanged']);
const SERVER_INFO_KEYS = new Set(['name', 'version']);
const LIST_RESULT_KEYS = new Set(['tools']);
const CALL_RESULT_KEYS = new Set(['structuredContent', 'content', 'isError']);
const CONTENT_ITEM_KEYS = new Set(['type', 'text']);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectUnknownKeys(value, allowed, failures) {
  if (!isPlainObject(value)) {
    return;
  }
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    failures.push('unmeasured-attestation');
  }
}

function decodeUnicodeEscapes(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/gu, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );
}

function sensitiveRepresentations(value) {
  const direct = new Set([
    value,
    value.replaceAll('\\', '/'),
    value.replaceAll('/', '\\'),
  ]);
  for (const representation of [...direct]) {
    direct.add(JSON.stringify(representation).slice(1, -1));
    direct.add(
      [...representation]
        .map(
          (character) =>
            `\\u${character.codePointAt(0).toString(16).padStart(4, '0')}`,
        )
        .join(''),
    );
  }
  return [...direct].filter((entry) => entry.length > 0);
}

export function scanForbiddenOutput(
  rawOutputs,
  sensitiveStrings,
  decodedValues = [],
) {
  const violations = [];
  const sensitive = sensitiveStrings.filter(
    (value) => typeof value === 'string' && value.length > 0,
  );
  const needles = sensitive.flatMap(sensitiveRepresentations);
  const values = [
    ...rawOutputs,
    ...rawOutputs.map(decodeUnicodeEscapes),
    ...decodedValues.map((value) => JSON.stringify(value)),
  ];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const folded = value.toLocaleLowerCase('en-US');
    if (
      needles.some((needle) =>
        folded.includes(needle.toLocaleLowerCase('en-US')),
      )
    ) {
      violations.push('repository-path-leak');
    }
    const pathLikeValues = [value, decodeUnicodeEscapes(value)];
    if (
      pathLikeValues.some((candidate) =>
        /(?:^|[\s"'`=:])(?:\/(?:Users|home|private|tmp|var|etc|opt|root|Volumes)(?:\/|$)|[A-Za-z]:[\\/])/u.test(
          candidate,
        ),
      )
    ) {
      violations.push('absolute-path-like-material');
    }
    if (value.includes('\0') || value.includes('\\u0000')) {
      violations.push('nul-byte');
    }
    if (
      SECRET_LIKE_PATTERNS.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(value);
      })
    ) {
      violations.push('secret-like-material');
    }
  }
  return [...new Set(violations)];
}

function parseJsonLines(raw) {
  if (typeof raw !== 'string') {
    return null;
  }
  const lines = raw.replaceAll('\r\n', '\n').split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  if (lines.length === 0 || lines.some((line) => line.length === 0)) {
    return null;
  }
  try {
    return lines.map((line) => JSON.parse(line));
  } catch {
    return null;
  }
}

function inspectObservationKeys(input, failures) {
  collectUnknownKeys(input, OBSERVATION_KEYS, failures);
  collectUnknownKeys(input?.cli, CLI_KEYS, failures);
  collectUnknownKeys(input?.mcp, MCP_KEYS, failures);
  collectUnknownKeys(input?.forbiddenScan, FORBIDDEN_SCAN_KEYS, failures);
  collectUnknownKeys(input?.repository, REPOSITORY_KEYS, failures);
  collectUnknownKeys(
    input?.repository?.before,
    REPOSITORY_STATE_KEYS,
    failures,
  );
  collectUnknownKeys(input?.repository?.after, REPOSITORY_STATE_KEYS, failures);
}

function isValidRepositoryState(value) {
  return (
    isPlainObject(value) &&
    typeof value.branch === 'string' &&
    value.branch.length > 0 &&
    typeof value.headSha === 'string' &&
    /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u.test(value.headSha) &&
    typeof value.indexPath === 'string' &&
    (value.indexPath.startsWith('/') ||
      /^[A-Za-z]:[\\/]/u.test(value.indexPath)) &&
    typeof value.indexSha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.indexSha256) &&
    typeof value.worktreeTreeSha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.worktreeTreeSha256) &&
    Number.isSafeInteger(value.worktreeEntryCount) &&
    value.worktreeEntryCount >= 0
  );
}

function inspectRequestKeys(requests, failures) {
  for (const request of requests) {
    collectUnknownKeys(request, REQUEST_KEYS, failures);
    if (request?.method === 'initialize') {
      collectUnknownKeys(request.params, INITIALIZE_PARAMS_KEYS, failures);
      collectUnknownKeys(
        request.params?.clientInfo,
        CLIENT_INFO_KEYS,
        failures,
      );
      collectUnknownKeys(request.params?.capabilities, new Set(), failures);
    } else if (request?.method === 'tools/call') {
      collectUnknownKeys(request.params, CALL_PARAMS_KEYS, failures);
      collectUnknownKeys(
        request.params?.arguments,
        CALL_ARGUMENT_KEYS,
        failures,
      );
    } else if (
      (request?.method === 'notifications/initialized' ||
        request?.method === 'tools/list') &&
      Object.hasOwn(request, 'params')
    ) {
      failures.push('unmeasured-attestation');
    }
  }
}

function inspectResponseKeys(frames, requests, failures) {
  const methods = new Map(
    requests
      .filter((request) => Object.hasOwn(request, 'id'))
      .map((request) => [request.id, request.method]),
  );
  for (const frame of frames) {
    collectUnknownKeys(frame, RESPONSE_KEYS, failures);
    const method = methods.get(frame?.id);
    if (method === 'initialize') {
      collectUnknownKeys(frame.result, INITIALIZE_RESULT_KEYS, failures);
      collectUnknownKeys(
        frame.result?.capabilities,
        CAPABILITIES_KEYS,
        failures,
      );
      collectUnknownKeys(
        frame.result?.capabilities?.tools,
        TOOLS_CAPABILITY_KEYS,
        failures,
      );
      collectUnknownKeys(frame.result?.serverInfo, SERVER_INFO_KEYS, failures);
    } else if (method === 'tools/list') {
      collectUnknownKeys(frame.result, LIST_RESULT_KEYS, failures);
    } else if (method === 'tools/call') {
      collectUnknownKeys(frame.result, CALL_RESULT_KEYS, failures);
      if (Array.isArray(frame.result?.content)) {
        for (const item of frame.result.content) {
          collectUnknownKeys(item, CONTENT_ITEM_KEYS, failures);
        }
      }
    }
  }
}

function hasLocateEvidence(result) {
  if (!isPlainObject(result) || result.ok !== true) {
    return false;
  }
  const evidence = result.evidence;
  if (!isPlainObject(evidence)) {
    return false;
  }
  const confirmed = Array.isArray(evidence.confirmed) ? evidence.confirmed : [];
  const candidates = Array.isArray(evidence.candidates)
    ? evidence.candidates
    : [];
  if (
    [...confirmed, ...candidates].some(
      (entry) => entry?.location?.file === 'package.json',
    )
  ) {
    return true;
  }
  return (
    confirmed.length === 0 &&
    candidates.length === 0 &&
    evidence.coverage?.strategyComplete === true &&
    evidence.status === 'no_result'
  );
}

function validateLocateResult(result, failures) {
  if (!isPlainObject(result)) {
    failures.push('cli-json-invalid');
    return false;
  }
  if (result.ok !== true) {
    failures.push('locate-ok-false');
    return false;
  }
  const parsed = locateResultSchema?.safeParse(result) ?? { success: false };
  if (!parsed.success || result.evidence?.schemaVersion !== '2.0') {
    failures.push('locate-schema-mismatch');
  }
  if (result.evidence?.status === 'cancelled') {
    failures.push('locate-cancelled');
  }
  if (result.evidence?.status === 'timeout') {
    failures.push('locate-timeout');
  }
  if (!hasLocateEvidence(result)) {
    failures.push('locate-evidence-insufficient');
  }
  return parsed.success;
}

function validateMcpSession(input, expectedCall, expectedServer, failures) {
  const requests = parseJsonLines(input?.stdin);
  const frames = parseJsonLines(input?.stdout);
  if (requests === null || frames === null) {
    failures.push('mcp-stdout-protocol-invalid');
    return null;
  }
  if (
    !Array.isArray(input?.requests) ||
    !Array.isArray(input?.frames) ||
    !isDeepStrictEqual(requests, input.requests) ||
    !isDeepStrictEqual(frames, input.frames)
  ) {
    failures.push('mcp-stdout-protocol-invalid');
  }
  inspectRequestKeys(requests, failures);
  inspectResponseKeys(frames, requests, failures);
  const phases = requests.map((request) => request.method);
  if (
    !isDeepStrictEqual(phases, [
      'initialize',
      'notifications/initialized',
      'tools/list',
      'tools/call',
    ]) ||
    requests[1]?.jsonrpc !== '2.0' ||
    Object.hasOwn(requests[1] ?? {}, 'id') ||
    Object.hasOwn(requests[1] ?? {}, 'params') ||
    requests[2]?.jsonrpc !== '2.0' ||
    Object.hasOwn(requests[2] ?? {}, 'params') ||
    frames.length !== 3 ||
    !isDeepStrictEqual(
      frames.map((frame) => frame?.id),
      [requests[0]?.id, requests[2]?.id, requests[3]?.id],
    )
  ) {
    failures.push('mcp-result-invalid');
  }
  const initialize = requests[0];
  const list = requests[2];
  const call = requests[3];
  const initializeResponse = frames.find(
    (frame) => frame?.id === initialize?.id,
  );
  const listResponse = frames.find((frame) => frame?.id === list?.id);
  const callResponse = frames.find((frame) => frame?.id === call?.id);
  if (
    initialize?.jsonrpc !== '2.0' ||
    initialize?.params?.protocolVersion !==
      initializeResponse?.result?.protocolVersion ||
    initializeResponse?.jsonrpc !== '2.0' ||
    listResponse?.jsonrpc !== '2.0' ||
    callResponse?.jsonrpc !== '2.0' ||
    list?.jsonrpc !== '2.0' ||
    call?.jsonrpc !== '2.0' ||
    !isPlainObject(call?.params?.arguments) ||
    call?.params?.name !== expectedCall?.name ||
    !isDeepStrictEqual(call?.params?.arguments, expectedCall?.arguments) ||
    initializeResponse?.result?.serverInfo?.name !== expectedServer?.name ||
    initializeResponse?.result?.serverInfo?.version !==
      expectedServer?.version ||
    initializeResponse?.result?.capabilities?.tools?.listChanged !==
      expectedServer?.listChanged ||
    !isDeepStrictEqual(listResponse?.result?.tools, [
      expectedServer?.toolDescriptor,
    ]) ||
    callResponse?.result?.isError !== false
  ) {
    failures.push('mcp-result-invalid');
  }
  const result = callResponse?.result?.structuredContent;
  const content = callResponse?.result?.content;
  if (
    !Array.isArray(content) ||
    content.length !== 1 ||
    content[0]?.type !== 'text' ||
    content[0]?.text !== JSON.stringify(result)
  ) {
    failures.push('mcp-result-invalid');
  }
  return result;
}

export function evaluateRealConsumerObservation(
  input,
  expectedCall = null,
  expectedServer = null,
) {
  const failures = [];
  if (!isPlainObject(input)) {
    return {
      ok: false,
      failures: ['unmeasured-attestation'],
      measured: {},
    };
  }
  inspectObservationKeys(input, failures);

  const hasAuthority =
    isPlainObject(expectedCall) &&
    typeof expectedCall.name === 'string' &&
    isPlainObject(expectedCall.arguments) &&
    isPlainObject(expectedServer) &&
    typeof expectedServer.name === 'string' &&
    typeof expectedServer.version === 'string' &&
    typeof expectedServer.listChanged === 'boolean' &&
    isPlainObject(expectedServer.toolDescriptor);
  if (!hasAuthority) {
    failures.push('mcp-authority-missing');
  }
  if (!isLocateResultSchemaAvailable()) {
    failures.push('locate-schema-unavailable');
  }

  const cli = input.cli ?? {};
  if (cli.exitCode !== 0) failures.push('cli-nonzero-exit');
  if (cli.signal !== null) failures.push('cli-signal-exit');
  if (cli.stderr !== '') failures.push('cli-stderr-not-empty');
  let cliResult = null;
  let cliJsonValid = false;
  if (typeof cli.stdout === 'string') {
    const lines = cli.stdout.replaceAll('\r\n', '\n').split('\n');
    if (lines.at(-1) === '') {
      lines.pop();
    }
    if (lines.length === 1 && lines[0].length > 0) {
      try {
        cliResult = JSON.parse(lines[0]);
        cliJsonValid = isPlainObject(cliResult);
      } catch {
        cliJsonValid = false;
      }
    }
  }
  if (!cliJsonValid) {
    failures.push('cli-json-invalid');
  }
  const cliSchemaValid =
    cliJsonValid && validateLocateResult(cliResult, failures);

  const mcp = input.mcp ?? {};
  if (mcp.exitCode !== 0 || mcp.signal !== null) {
    failures.push('mcp-result-invalid');
  }
  if (mcp.stderr !== '') failures.push('mcp-stderr-not-empty');
  const mcpResult = hasAuthority
    ? validateMcpSession(mcp, expectedCall, expectedServer, failures)
    : null;
  const mcpSchemaValid =
    mcpResult !== null && validateLocateResult(mcpResult, failures);
  const mcpCliParity =
    cliSchemaValid && mcpSchemaValid && isDeepStrictEqual(cliResult, mcpResult);
  if (cliSchemaValid && mcpSchemaValid && !mcpCliParity) {
    failures.push('mcp-cli-parity-mismatch');
  }

  const violations = input.forbiddenScan?.violations;
  const forbiddenScanPassed =
    Array.isArray(violations) && violations.length === 0;
  if (!forbiddenScanPassed) failures.push('forbidden-output-detected');

  let repositoryUnchanged = false;
  try {
    if (
      !isValidRepositoryState(input.repository?.before) ||
      !isValidRepositoryState(input.repository?.after)
    ) {
      throw new Error('repository state is invalid');
    }
    assertRepositoryStateUnchanged(
      input.repository.before,
      input.repository.after,
    );
    repositoryUnchanged = true;
  } catch {
    failures.push('repository-state-changed');
  }

  const uniqueFailures = [...new Set(failures)];
  return {
    ok: uniqueFailures.length === 0,
    failures: uniqueFailures,
    measured: {
      cli: {
        exitCode: cli.exitCode ?? null,
        signal: cli.signal ?? null,
        stderrEmpty: cli.stderr === '',
        jsonValid: cliJsonValid,
      },
      locate: {
        ok: cliResult?.ok === true,
        schemaVersion: cliResult?.evidence?.schemaVersion ?? null,
        status: cliResult?.evidence?.status ?? null,
        evidenceSatisfied: hasLocateEvidence(cliResult),
      },
      mcp: {
        exitCode: mcp.exitCode ?? null,
        signal: mcp.signal ?? null,
        stderrEmpty: mcp.stderr === '',
        transcriptValid: mcpResult !== null,
      },
      mcpCliParity,
      forbiddenScanPassed,
      repositoryUnchanged,
    },
  };
}

export function assertRealConsumerObservation(
  input,
  expectedCall = null,
  expectedServer = null,
) {
  const result = evaluateRealConsumerObservation(
    input,
    expectedCall,
    expectedServer,
  );
  if (!result.ok) {
    const error = new Error('real-consumer observation failed closed');
    error.failures = result.failures;
    throw error;
  }
  return result;
}
