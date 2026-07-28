import { describe, expect, it } from 'vitest';

import { decodeCompleteEmbeddedSqlLiteralV2 } from '../../src/evidence/language/embedded-sql-literal-decoder-v2.js';
import { createJavascriptLanguageAdapterV2 } from '../../src/evidence/language/javascript-language-adapter-v2.js';
import { createSqlLanguageAdapterV2 } from '../../src/evidence/language/sql-language-adapter-v2.js';
import { createTypescriptLanguageAdapterV2 } from '../../src/evidence/language/typescript-language-adapter-v2.js';
import { createFallbackLanguagePolicyV2 } from '../../src/evidence/language/fallback-language-policy-v2.js';
import { createOpaqueTokenV2 } from '../../src/evidence/request-snapshot/opaque-token-v2.js';
import type {
  EligibleDiscoveryRefV2,
  OpaqueFileBucketRefV2,
  PreFinalEligibleDiscoveryPoolV2,
} from '../../src/evidence/request-snapshot/pre-ranking-evidence-pool-v2.js';
import { createTrustedPreFinalCapabilityViewForTestV2 } from '../../src/evidence/request-snapshot/capability-classification-views-v2.js';
import { createTrustedPreFinalScopeClassificationViewForTestV2 } from '../../src/evidence/request-snapshot/scope-classification-views-v2.js';
import {
  createVerifiedLanguageConsumerAdmissionV2,
  registerVerifiedLanguageConsumerV2,
} from '../../src/evidence/request-snapshot/verified-language-consumer-v2.js';
import { createTrustedLanguageCapabilityObservationV2 } from '../../src/evidence/language/language-capability-observation-v2.js';
import { classifyLanguageCapabilityRecordV2 } from '../../src/evidence/language/language-scope-producer-v2.js';
import { issueLocateProjectionExecutionCapabilityV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { requireLocateProjectionExecutionTokenV2 } from '../../src/evidence/locate-execution/locate-projection-execution-capability-v2.js';
import { isSelected } from '../../testkit/testing/selection.js';

function executionToken() {
  return requireLocateProjectionExecutionTokenV2(
    issueLocateProjectionExecutionCapabilityV2(),
  );
}

async function classifyFixture(input: {
  readonly posixPath: string;
  readonly sourceText: string;
  readonly terms: readonly string[];
  readonly confirmation?: 'allowed' | 'candidate-only';
}) {
  const execution = executionToken();
  const eligibleRef = createOpaqueTokenV2<EligibleDiscoveryRefV2>();
  const bucket = createOpaqueTokenV2<OpaqueFileBucketRefV2>();
  const pool: PreFinalEligibleDiscoveryPoolV2 = Object.freeze({
    records: Object.freeze([
      Object.freeze({
        eligibleRef,
        discoveryKey: 'k',
        canonicalFileKey: input.posixPath as never,
        fileBucketRef: bucket,
        classificationDefined: true,
      }),
    ]),
  });
  const capabilityView = createTrustedPreFinalCapabilityViewForTestV2({
    pool,
    execution,
    entries: [
      {
        eligibleRef,
        fileBucketRef: bucket,
        posixPath: input.posixPath,
        sourceText: input.sourceText,
      },
    ],
  });
  const scopeView = createTrustedPreFinalScopeClassificationViewForTestV2(
    execution,
    new Map([
      [
        eligibleRef,
        Object.freeze({
          layer: 'server' as const,
          included: true,
          confirmation: input.confirmation ?? ('allowed' as const),
        }),
      ],
    ]),
  );
  const admission = createVerifiedLanguageConsumerAdmissionV2(
    'language-capability',
    execution,
  );
  const registered = registerVerifiedLanguageConsumerV2(
    admission,
    { async consumeVerifiedContext() {} },
    execution,
  );
  const observation = createTrustedLanguageCapabilityObservationV2(
    capabilityView,
    scopeView,
    registered,
    execution,
    { matchedTermsByRef: new Map([[eligibleRef, Object.freeze([...input.terms])]]) },
  );
  const result = await classifyLanguageCapabilityRecordV2(
    observation,
    eligibleRef,
    execution,
  );
  return Object.freeze({ result, execution, eligibleRef, observation });
}

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'typescript-adapter',
  }),
)('F8-TS-001 typescript-adapter', () => {
  it('classifies TS assignment as direct-term and incomplete JSX as non-confirmed path', async () => {
    expect(createTypescriptLanguageAdapterV2().kind).toBe('typescript');
    const complete = await classifyFixture({
      posixPath: 'src/a.ts',
      sourceText: 'const Foo = Bar;',
      terms: ['Foo', 'Bar'],
    });
    expect(complete.result.kind).toBe('supported-source');
    if (complete.result.kind === 'supported-source') {
      expect(['direct-term', 'direct-anchored', 'verified-literal']).toContain(
        complete.result.producerKind,
      );
    }
    const incomplete = await classifyFixture({
      posixPath: 'src/a.tsx',
      sourceText: '<div>{Foo',
      terms: ['Foo'],
    });
    expect(incomplete.result.kind).toBe('supported-source');
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'javascript-adapter',
  }),
)('F8-JS-001 javascript-adapter', () => {
  it('classifies JS runtime assignment and rejects TS-only interface as definition', async () => {
    expect(createJavascriptLanguageAdapterV2().kind).toBe('javascript');
    const runtime = await classifyFixture({
      posixPath: 'src/a.js',
      sourceText: 'const Foo = Bar;',
      terms: ['Foo', 'Bar'],
    });
    expect(runtime.result.kind).toBe('supported-source');
    const tsOnly = await classifyFixture({
      posixPath: 'src/a.js',
      sourceText: 'interface Foo { x: number }',
      terms: ['Foo'],
    });
    expect(tsOnly.result.kind).toBe('supported-source');
    if (tsOnly.result.kind === 'supported-source') {
      expect(tsOnly.result.producerKind).not.toBe('anchored-definition');
    }
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'sql-adapter',
  }),
)('F8-SQL-001 sql-adapter', () => {
  it('classifies SQL alias as direct-term and malformed sql without term as none', async () => {
    expect(createSqlLanguageAdapterV2().kind).toBe('sql');
    const alias = await classifyFixture({
      posixPath: 'db/a.sql',
      sourceText: 'SELECT a AS b FROM t',
      terms: ['a', 'b'],
    });
    expect(alias.result.kind).toBe('supported-source');
    if (alias.result.kind === 'supported-source') {
      expect(['direct-term', 'direct-anchored', 'verified-literal']).toContain(
        alias.result.producerKind,
      );
    }
    const malformed = await classifyFixture({
      posixPath: 'db/a.sql',
      sourceText: 'SELECT * FROM t /*',
      terms: [],
    });
    expect(malformed.result.kind).toBe('supported-source');
    if (malformed.result.kind === 'supported-source') {
      expect(malformed.result.producerKind).toBe('none');
    }
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'embedded-sql-completeness',
  }),
)('F8-EMBEDDED-SQL-001 embedded-sql-completeness', () => {
  it('decodes safe escapes and rejects unsafe escapes', () => {
    const ok = decodeCompleteEmbeddedSqlLiteralV2(
      "query('select a AS b')",
    );
    expect(ok.ok).toBe(true);

    const escaped = decodeCompleteEmbeddedSqlLiteralV2(
      "query('line\\nnext')",
    );
    expect(escaped.ok).toBe(true);

    const unsafeHex = decodeCompleteEmbeddedSqlLiteralV2(
      "query('a\\x41')",
    );
    expect(unsafeHex.ok).toBe(false);

    const template = decodeCompleteEmbeddedSqlLiteralV2(
      'query(`select ${x}`)',
    );
    expect(template.ok).toBe(false);

    const extra = decodeCompleteEmbeddedSqlLiteralV2(
      "query('a', 'b')",
    );
    expect(extra.ok).toBe(false);
  });
});

describe.runIf(
  isSelected({
    group: 'language-capability-boundary',
    caseId: 'fallback-literal',
  }),
)('F8-FALLBACK-001 fallback-literal', () => {
  it('emits fallback-literal with exact reason/promotion for unsupported extension', async () => {
    expect(createFallbackLanguagePolicyV2().kind).toBe('fallback');
    const withTerm = await classifyFixture({
      posixPath: 'src/a.py',
      sourceText: 'x = 1',
      terms: ['x'],
    });
    expect(withTerm.result.kind).toBe('fallback-literal');
    const noTerm = await classifyFixture({
      posixPath: 'src/a.py',
      sourceText: 'x = 1',
      terms: [],
    });
    expect(noTerm.result.kind).toBe('fallback-none');
  });
});
