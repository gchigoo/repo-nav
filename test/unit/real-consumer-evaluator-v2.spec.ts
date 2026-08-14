import { beforeAll, describe, expect, it } from 'vitest';

import {
  createRealConsumerObservationV2,
  REAL_CONSUMER_EXPECTED_CALL_V2,
  REAL_CONSUMER_EXPECTED_SERVER_V2,
  REAL_CONSUMER_LOCATE_RESULT_OTHER_V2,
} from '../../testkit/fixtures/release-v2/real-consumer-observations-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';
import {
  assertRealConsumerObservation,
  evaluateRealConsumerObservation,
  REAL_CONSUMER_FAILURE_CODES,
  reloadLocateResultSchema,
  reloadLocateResultSchemaFromSource,
  scanForbiddenOutput,
  // @ts-expect-error release helpers are plain ESM modules without declarations
} from '../../tools/release/real-consumer-evaluator.mjs';

const selected = isSelected({
  group: 'public-beta-release',
  caseId: 'real-consumer-read-only',
});

beforeAll(async () => {
  if (selected && !(await reloadLocateResultSchemaFromSource())) {
    throw new Error('Real-consumer locate schema could not be loaded.');
  }
});

function evaluate(observation: unknown) {
  return evaluateRealConsumerObservation(
    observation,
    REAL_CONSUMER_EXPECTED_CALL_V2,
    REAL_CONSUMER_EXPECTED_SERVER_V2,
  ) as {
    readonly ok: boolean;
    readonly failures: readonly string[];
    readonly measured: Readonly<Record<string, unknown>>;
  };
}

describe.runIf(selected)('H1 real-consumer observation evaluator', () => {
  it('accepts only a complete measured CLI and MCP observation', () => {
    const observation = createRealConsumerObservationV2();
    expect(evaluate(observation)).toMatchObject({
      ok: true,
      failures: [],
      measured: {
        mcpCliParity: true,
        forbiddenScanPassed: true,
        repositoryUnchanged: true,
      },
    });
    expect(
      assertRealConsumerObservation(
        observation,
        REAL_CONSUMER_EXPECTED_CALL_V2,
        REAL_CONSUMER_EXPECTED_SERVER_V2,
      ),
    ).toMatchObject({ ok: true });
  });

  it('preserves the exact measured failure list on rejection', () => {
    const observation = createRealConsumerObservationV2([
      { path: ['cli', 'exitCode'], value: 3 },
    ]);
    try {
      assertRealConsumerObservation(
        observation,
        REAL_CONSUMER_EXPECTED_CALL_V2,
        REAL_CONSUMER_EXPECTED_SERVER_V2,
      );
      throw new Error('Expected observation rejection.');
    } catch (error) {
      expect(
        (error as Error & { failures?: readonly string[] }).failures,
      ).toEqual(['cli-nonzero-exit']);
    }
  });

  it.each([
    [
      'nonzero CLI exit',
      createRealConsumerObservationV2([
        { path: ['cli', 'exitCode'], value: 3 },
      ]),
      'cli-nonzero-exit',
    ],
    [
      'CLI signal',
      createRealConsumerObservationV2([
        { path: ['cli', 'signal'], value: 'SIGTERM' },
      ]),
      'cli-signal-exit',
    ],
    [
      'CLI stderr',
      createRealConsumerObservationV2([
        { path: ['cli', 'stderr'], value: 'unexpected diagnostic' },
      ]),
      'cli-stderr-not-empty',
    ],
    [
      'invalid CLI JSON',
      createRealConsumerObservationV2([
        { path: ['cli', 'stdout'], value: '{' },
      ]),
      'cli-json-invalid',
    ],
    [
      'multiple CLI JSON values',
      createRealConsumerObservationV2([
        {
          path: ['cli', 'stdout'],
          value: `${JSON.stringify(REAL_CONSUMER_LOCATE_RESULT_OTHER_V2)}\n${JSON.stringify(REAL_CONSUMER_LOCATE_RESULT_OTHER_V2)}\n`,
        },
      ]),
      'cli-json-invalid',
    ],
    [
      'locate error',
      createRealConsumerObservationV2([
        {
          path: ['cliResult'],
          value: {
            ok: false,
            error: {
              code: 'INVALID_REPOSITORY',
              message: 'Repository root is invalid or unavailable.',
              recoverable: true,
            },
          },
        },
      ]),
      'locate-ok-false',
    ],
    [
      'wrong locate schema',
      createRealConsumerObservationV2([
        {
          path: ['cliResult', 'evidence', 'schemaVersion'],
          value: '1.0',
        },
      ]),
      'locate-schema-mismatch',
    ],
    [
      'cancelled locate',
      createRealConsumerObservationV2([
        { path: ['cliResult', 'evidence', 'status'], value: 'cancelled' },
      ]),
      'locate-cancelled',
    ],
    [
      'timeout locate',
      createRealConsumerObservationV2([
        { path: ['cliResult', 'evidence', 'status'], value: 'timeout' },
      ]),
      'locate-timeout',
    ],
    [
      'insufficient no-result',
      createRealConsumerObservationV2([
        { path: ['cliResult', 'evidence', 'status'], value: 'no_result' },
        { path: ['cliResult', 'evidence', 'candidates'], value: [] },
        {
          path: ['cliResult', 'evidence', 'coverage', 'strategyComplete'],
          value: false,
        },
      ]),
      'locate-evidence-insufficient',
    ],
    [
      'empty partial result',
      createRealConsumerObservationV2([
        { path: ['cliResult', 'evidence', 'status'], value: 'partial' },
        { path: ['cliResult', 'evidence', 'confirmed'], value: [] },
        { path: ['cliResult', 'evidence', 'candidates'], value: [] },
        {
          path: ['cliResult', 'evidence', 'coverage', 'strategyComplete'],
          value: true,
        },
      ]),
      'locate-evidence-insufficient',
    ],
    [
      'excerpt-only package mention',
      createRealConsumerObservationV2([
        {
          path: [
            'cliResult',
            'evidence',
            'candidates',
            '0',
            'location',
            'file',
          ],
          value: 'README.md',
        },
      ]),
      'locate-evidence-insufficient',
    ],
    [
      'MCP parity mismatch',
      createRealConsumerObservationV2([
        { path: ['mcpResult'], value: REAL_CONSUMER_LOCATE_RESULT_OTHER_V2 },
      ]),
      'mcp-cli-parity-mismatch',
    ],
    [
      'forbidden output',
      createRealConsumerObservationV2([
        {
          path: ['forbiddenScan', 'violations'],
          value: ['repository-path-leak'],
        },
      ]),
      'forbidden-output-detected',
    ],
    [
      'MCP stdin framing',
      createRealConsumerObservationV2([
        { path: ['mcp', 'stdin'], value: '{not-json}\n' },
      ]),
      'mcp-stdout-protocol-invalid',
    ],
    [
      'MCP stdout framing',
      createRealConsumerObservationV2([
        { path: ['mcp', 'stdout'], value: '{not-json}\n' },
      ]),
      'mcp-stdout-protocol-invalid',
    ],
    [
      'MCP recorded response mismatch',
      createRealConsumerObservationV2([{ path: ['mcp', 'frames'], value: [] }]),
      'mcp-stdout-protocol-invalid',
    ],
    [
      'MCP recorded request mismatch',
      createRealConsumerObservationV2([
        { path: ['mcp', 'requests'], value: [] },
      ]),
      'mcp-stdout-protocol-invalid',
    ],
    [
      'MCP response version',
      createRealConsumerObservationV2([
        { path: ['mcp', 'frames', '0', 'jsonrpc'], value: '1.0' },
        {
          path: ['mcp', 'stdout'],
          value: `${JSON.stringify({
            ...(createRealConsumerObservationV2().mcp.frames[0] as Record<
              string,
              unknown
            >),
            jsonrpc: '1.0',
          })}\n${JSON.stringify(
            createRealConsumerObservationV2().mcp.frames[1],
          )}\n${JSON.stringify(
            createRealConsumerObservationV2().mcp.frames[2],
          )}\n`,
        },
      ]),
      'mcp-result-invalid',
    ],
    [
      'MCP response order',
      createRealConsumerObservationV2([
        {
          path: ['mcp', 'stdout'],
          value: `${JSON.stringify(
            createRealConsumerObservationV2().mcp.frames[1],
          )}\n${JSON.stringify(
            createRealConsumerObservationV2().mcp.frames[0],
          )}\n${JSON.stringify(
            createRealConsumerObservationV2().mcp.frames[2],
          )}\n`,
        },
        {
          path: ['mcp', 'frames'],
          value: [
            createRealConsumerObservationV2().mcp.frames[1],
            createRealConsumerObservationV2().mcp.frames[0],
            createRealConsumerObservationV2().mcp.frames[2],
          ],
        },
      ]),
      'mcp-result-invalid',
    ],
    [
      'MCP stderr',
      createRealConsumerObservationV2([
        { path: ['mcp', 'stderr'], value: 'unexpected diagnostic' },
      ]),
      'mcp-stderr-not-empty',
    ],
    [
      'MCP signal',
      createRealConsumerObservationV2([
        { path: ['mcp', 'signal'], value: 'SIGTERM' },
      ]),
      'mcp-result-invalid',
    ],
    [
      'repository head mutation',
      createRealConsumerObservationV2([
        { path: ['repository', 'after', 'headSha'], value: 'f'.repeat(40) },
      ]),
      'repository-state-changed',
    ],
    [
      'repository index mutation',
      createRealConsumerObservationV2([
        {
          path: ['repository', 'after', 'indexSha256'],
          value: 'f'.repeat(64),
        },
      ]),
      'repository-state-changed',
    ],
    [
      'repository worktree mutation',
      createRealConsumerObservationV2([
        {
          path: ['repository', 'after', 'worktreeTreeSha256'],
          value: 'e'.repeat(64),
        },
      ]),
      'repository-state-changed',
    ],
    [
      'malformed equal repository states',
      createRealConsumerObservationV2([
        {
          path: ['repository', 'before', 'indexSha256'],
          value: 'not-a-hash',
        },
        {
          path: ['repository', 'after', 'indexSha256'],
          value: 'not-a-hash',
        },
      ]),
      'repository-state-changed',
    ],
  ])('fails closed for %s', (_name, observation, expectedFailure) => {
    const result = evaluate(observation);
    expect(result.ok).toBe(false);
    expect(result.failures).toContain(expectedFailure);
  });

  it('detects direct, escaped, decoded, and secret-like forbidden output', () => {
    const sensitive = '/private/tmp/foreign-repository/.git/index';
    const unicodeEscaped = [...sensitive]
      .map(
        (character) =>
          `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`,
      )
      .join('');
    expect(scanForbiddenOutput([sensitive], [sensitive])).toContain(
      'repository-path-leak',
    );
    expect(scanForbiddenOutput([unicodeEscaped], [sensitive])).toContain(
      'repository-path-leak',
    );
    expect(
      scanForbiddenOutput([], [sensitive], [{ [sensitive]: 'leaked' }]),
    ).toContain('repository-path-leak');
    expect(
      scanForbiddenOutput(
        ['token=ghp_1234567890abcdefghijklmnopqrstuvwxyzAB'],
        [],
      ),
    ).toContain('secret-like-material');
    expect(
      scanForbiddenOutput(['unexpected=/private/tmp/other-repository'], []),
    ).toContain('absolute-path-like-material');
    expect(
      scanForbiddenOutput(
        ['prefix my_private_value_123456 suffix'],
        ['my_private_value_123456'],
      ),
    ).toContain('repository-path-leak');
  });

  it('keeps the exported failure-code authority exact', async () => {
    await reloadLocateResultSchema(
      new URL('file:///does-not-exist/locate-result-v2.js'),
    );
    let failure: { readonly error: unknown } | undefined;
    let restored = false;
    try {
      expect(evaluate(createRealConsumerObservationV2()).failures).toContain(
        'locate-schema-unavailable',
      );
      expect(REAL_CONSUMER_FAILURE_CODES).toEqual([
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
    } catch (error: unknown) {
      failure = { error };
    } finally {
      restored = await reloadLocateResultSchemaFromSource();
    }
    if (!restored) {
      throw new Error('Real-consumer locate schema could not be restored.');
    }
    if (failure !== undefined) {
      throw failure.error;
    }
  });

  it('fails closed on missing authority and unknown attestation fields', () => {
    const observations: Array<Record<string, unknown>> = [
      createRealConsumerObservationV2() as unknown as Record<string, unknown>,
      createRealConsumerObservationV2() as unknown as Record<string, unknown>,
      createRealConsumerObservationV2() as unknown as Record<string, unknown>,
    ];
    observations[0]!['serviceMcpCliParity'] = true;
    (observations[1]!['mcp'] as Record<string, unknown>)['transcriptVerified'] =
      true;
    const repository = observations[2]!['repository'] as Record<
      string,
      unknown
    >;
    (repository['before'] as Record<string, unknown>)['clean'] = true;

    expect(
      evaluateRealConsumerObservation(createRealConsumerObservationV2())
        .failures,
    ).toContain('mcp-authority-missing');
    for (const observation of observations) {
      expect(evaluate(observation).failures).toContain(
        'unmeasured-attestation',
      );
    }
  });
});
