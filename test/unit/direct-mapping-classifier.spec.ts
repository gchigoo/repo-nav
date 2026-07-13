import { describe, expect, it } from 'vitest';

import {
  createDiscoveryKey,
  type EvidenceLocation,
  type NormalizedSearchTerm,
} from '../../src/contracts/index.js';
import {
  classifyDiscoveryRecords,
  resolveRepositoryLayer,
} from '../../src/evidence/direct-mapping-classifier.js';
import type { DiscoveryRecord } from '../../src/evidence/discovery-record.js';
import { isSelected } from '../../testkit/testing/selection.js';

const classifierIdentity = {
  group: 'direct-mapping-classifier',
  caseId: 'direct-mapping-classifier',
} as const;
const orderingIdentity = {
  group: 'evidence-id-order',
  caseId: 'evidence-id-order',
} as const;
const mappingTerms: readonly NormalizedSearchTerm[] = [
  { value: 'targetField', caseSensitive: false },
  { value: 'row.source_field', caseSensitive: false },
];

function record(
  file: string,
  excerpt: string,
  matchedTerms: readonly NormalizedSearchTerm[] = mappingTerms,
  canonicalSymbol?: string,
  focusExcerpt = excerpt,
): DiscoveryRecord {
  const lineCount = excerpt.split('\n').length;
  const location: EvidenceLocation = { file, lines: [1, lineCount], excerpt };
  return {
    discoveryKey: createDiscoveryKey(location),
    location,
    discoveredBy: ['ripgrep'],
    operations: ['RIPGREP_SEARCH', 'FILESYSTEM_READ_RANGE'],
    discoveryReasonCodes: ['LITERAL_TERM_HIT'],
    matchedTerms,
    focusLines: [lineCount, lineCount],
    focusExcerpt,
    canonicalSymbols:
      canonicalSymbol === undefined ? [] : [canonicalSymbol],
  };
}

const emptyContext = {
  anchors: [],
  layers: [],
  negativeTerms: [],
} as const;

describe.runIf(isSelected(classifierIdentity))('direct mapping classifier', () => {
  it.each([
    ['assignment', 'targetField = row.source_field;'],
    ['return object', 'return { targetField: row.source_field };'],
    ['assigned object', 'const mapped = { targetField: row.source_field };'],
    ['call object', 'emit({ targetField: row.source_field });'],
    ['SQL file', 'SELECT row.source_field AS targetField FROM source'],
    ['SQL call', 'query("SELECT row.source_field AS targetField FROM source")'],
  ])('confirms supported %s syntax', (_name, excerpt) => {
    const file = _name === 'SQL file' ? 'db/mapping.sql' : 'server/mapping.ts';
    const result = classifyDiscoveryRecords([record(file, excerpt)], emptyContext);
    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]).toMatchObject({
      role: 'value-mapping',
      reasonCodes: ['DIRECT_ALIAS_MAPPING', 'EXACT_TERM_MATCH'],
    });
    expect(result.candidates).toEqual([]);
  });

  it.each([
    ['equality', 'targetField == row.source_field;'],
    ['type default', 'type targetField = row.source_field;'],
    ['comment', '// targetField = row.source_field;'],
    ['string example', 'const example = "targetField = row.source_field";'],
    ['one-sided use', 'consume(row.source_field);'],
    ['interface property', 'interface Dto { targetField: row.source_field }'],
    ['decorator metadata', '@Field({ targetField: row.source_field })'],
    ['shorthand', 'return { targetField };'],
    ['dynamic SQL', 'query(`SELECT row.source_field AS targetField ${where}`)'],
    ['SQL call inside string', 'const example = "query(\\\"SELECT row.source_field AS targetField\\\")";'],
    ['SQL alias comment', '// query("SELECT row.source_field AS targetField")'],
    ['mixed type declaration', 'const harmless = {}; type targetField = row.source_field;'],
    ['mixed interface declaration', 'const harmless = {}; interface Dto { targetField: row.source_field }'],
    ['regex literal', 'const pattern = /targetField = row.source_field/;'],
    ['arrow regex literal', 'const pattern = () => /targetField = row.source_field/;'],
    ['control-flow regex literal', 'if (ready) /targetField = row.source_field/.test(text);'],
    ['loop regex literal', 'while (ready) /targetField = row.source_field/.test(text);'],
    ['SQL quoted literal', "SELECT 'row.source_field AS targetField' AS note"],
    ['SQL dollar-quoted literal', 'SELECT $$ row.source_field AS targetField ; $$ AS note'],
    ['SQL comment alias', '-- SELECT row.source_field AS targetField'],
    ['SQL nested block comment', '/* outer /* inner */ row.source_field AS targetField */ SELECT 1'],
  ])('does not confirm %s decoy', (_name, excerpt) => {
    const matched = excerpt.includes('row.source_field')
      ? mappingTerms
      : mappingTerms.slice(0, 1);
    const file = _name.startsWith('SQL ') ? 'db/decoy.sql' : 'server/decoy.ts';
    const result = classifyDiscoveryRecords(
      [record(file, excerpt, matched)],
      emptyContext,
    );
    expect(result.confirmed).toEqual([]);
    expect(result.candidates[0]).toMatchObject({
      reasonCodes: ['EXACT_TERM_WITHOUT_DIRECT_MAPPING'],
      promotionRequirements: [
        'USER_SEMANTIC_CONFIRMATION',
        'DIRECT_REFERENCE_REQUIRED',
      ],
    });
  });

  it('handles explicit symbol definitions separately from references', () => {
    const symbolTerm = [{ value: 'mapRow', caseSensitive: true }] as const;
    const anchors = [
      { kind: 'symbol', value: 'mapRow', caseSensitive: true },
    ] as const;
    const implementation = record(
      'server/map.ts',
      'function mapRow(row) { return row; }',
      symbolTerm,
      'mapRow',
    );
    const method = record(
      'server/mapper.ts',
      'public async mapRow<T>(row: T) { return row; }',
      symbolTerm,
      'mapRow',
    );
    const inlineClassMethod = record(
      'server/inline-class.ts',
      'class Mapper { mapRow(row) { return row; } }',
      symbolTerm,
      'mapRow',
    );
    const inlineObjectMethod = record(
      'server/inline-object.ts',
      'const mapper = { mapRow(row) { return row; } };',
      symbolTerm,
      'mapRow',
    );
    const reference = record(
      'server/use.ts',
      'const result = mapRow(row);',
      symbolTerm,
      'mapRow',
    );
    const alias = record(
      'server/alias.ts',
      'const mapRow = importedMapRow;',
      symbolTerm,
      'mapRow',
    );
    const conditionalCall = record(
      'server/conditional.ts',
      'if (mapRow()) {',
      symbolTerm,
      'mapRow',
    );
    const loopCall = record(
      'server/loop.ts',
      'while (mapRow()) {',
      symbolTerm,
      'mapRow',
    );
    const result = classifyDiscoveryRecords(
      [
        reference,
        implementation,
        method,
        inlineClassMethod,
        inlineObjectMethod,
        alias,
        conditionalCall,
        loopCall,
      ],
      { ...emptyContext, anchors },
    );
    expect(result.confirmed[0]).toMatchObject({
      role: 'execution-site',
      reasonCodes: ['EXACT_SYMBOL_ANCHOR'],
    });
    expect(result.confirmed).toHaveLength(4);
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasonCodes: ['SYMBOL_REFERENCE_ONLY'],
          promotionRequirements: ['DIRECT_REFERENCE_REQUIRED', 'CALL_PATH_REQUIRED'],
        }),
      ]),
    );
  });

  it('selects the highest-priority definition from all canonical symbol facts', () => {
    const excerpt = 'function Zeta(){ Alpha(); }';
    const base = record(
      'server/symbols.ts',
      excerpt,
      [],
      undefined,
    );
    const anchors = [
      { kind: 'symbol', value: 'Alpha', caseSensitive: true },
      { kind: 'symbol', value: 'Zeta', caseSensitive: true },
    ] as const;
    const classify = (canonicalSymbols: readonly string[]) =>
      classifyDiscoveryRecords(
        [{ ...base, canonicalSymbols }],
        { ...emptyContext, anchors },
      );
    const forward = classify(['Alpha', 'Zeta']);
    const reversed = classify(['Zeta', 'Alpha']);
    expect(forward).toEqual(reversed);
    expect(forward).toMatchObject({
      confirmed: [
        {
          role: 'execution-site',
          location: { symbol: 'Zeta' },
          reasonCodes: ['EXACT_SYMBOL_ANCHOR'],
        },
      ],
      candidates: [],
    });
  });

  it('does not let member-name division mask a later supported assignment', () => {
    for (const member of ['return', 'await', 'do', 'else']) {
      const excerpt = `const ratio = obj.${member} / divisor; targetField = row.source_field;`;
      const result = classifyDiscoveryRecords(
        [record('server/mapping.ts', excerpt)],
        emptyContext,
      );
      expect(result.confirmed).toHaveLength(1);
      expect(result.candidates).toEqual([]);
    }
    for (const member of ['if', 'while', 'for', 'with']) {
      const excerpt = `const ratio = control.${member}(value) / divisor; targetField = row.source_field;`;
      const result = classifyDiscoveryRecords(
        [record('server/mapping.ts', excerpt)],
        emptyContext,
      );
      expect(result.confirmed).toHaveLength(1);
      expect(result.candidates).toEqual([]);
    }
  });

  it('binds mapping predicates to the focus line inside a bounded logical window', () => {
    const multiline = 'return {\n  targetField: row.source_field';
    const confirmed = classifyDiscoveryRecords(
      [record('server/map.ts', multiline, mappingTerms, undefined, '  targetField: row.source_field')],
      emptyContext,
    );
    expect(confirmed.confirmed).toHaveLength(1);

    const unrelated = classifyDiscoveryRecords(
      [
        record(
          'server/map.ts',
          'targetField = row.source_field;\nconsume(row.source_field);',
          mappingTerms,
          undefined,
          'consume(row.source_field);',
        ),
      ],
      emptyContext,
    );
    expect(unrelated.confirmed).toEqual([]);

    const focus = '  targetField: row.source_field';
    const fixedBytes = Buffer.byteLength(`return {\n${focus}`, 'utf8');
    const atLimit = `return {${' '.repeat(4096 - fixedBytes)}\n${focus}`;
    const overLimit = `return {${' '.repeat(4097 - fixedBytes)}\n${focus}`;
    expect(Buffer.byteLength(atLimit, 'utf8')).toBe(4096);
    expect(
      classifyDiscoveryRecords(
        [record('server/map.ts', atLimit, mappingTerms, undefined, focus)],
        emptyContext,
      ).confirmed,
    ).toHaveLength(1);
    expect(
      classifyDiscoveryRecords(
        [record('server/map.ts', overLimit, mappingTerms, undefined, focus)],
        emptyContext,
      ).confirmed,
    ).toEqual([]);

    const thirteenLines = [
      'return {',
      ...Array.from({ length: 11 }, () => ''),
      focus,
    ].join('\n');
    expect(thirteenLines.split('\n')).toHaveLength(13);
    expect(
      classifyDiscoveryRecords(
        [record('server/map.ts', thirteenLines, mappingTerms, undefined, focus)],
        emptyContext,
      ).confirmed,
    ).toEqual([]);
  });

  it('resolves layer paths deterministically and never confirms test/docs mappings', () => {
    expect(resolveRepositoryLayer('docs/__tests__/mapping.ts')).toBe('test');
    expect(resolveRepositoryLayer('SERVER\\MAPPING.SPEC.TS')).toBe('test');
    expect(resolveRepositoryLayer('Examples/guide.ts')).toBe('docs');
    expect(resolveRepositoryLayer('README.MDX')).toBe('docs');
    expect(resolveRepositoryLayer('server/mapping.ts')).toBe('server');
    expect(resolveRepositoryLayer('packages/mapping.ts')).toBe('unknown');

    const testResult = classifyDiscoveryRecords(
      [record('tests/mapping.spec.ts', 'targetField = row.source_field;')],
      { ...emptyContext, layers: ['test'] },
    );
    expect(testResult.confirmed).toEqual([]);
    expect(testResult.candidates[0]?.evidenceClass).toBe('candidate');
  });
});

describe.runIf(isSelected(orderingIdentity))('evidence ID and ordering', () => {
  it('keeps class, IDs, reasons, and ordering stable across record permutations', () => {
    const records = [
      record('server/z.ts', 'consume(row.source_field);'),
      record('server/a.ts', 'targetField = row.source_field;'),
    ];
    const forward = classifyDiscoveryRecords(records, emptyContext);
    const reversed = classifyDiscoveryRecords([...records].reverse(), emptyContext);

    expect(forward).toEqual(reversed);
    expect(forward.recordsClassified).toBe(2);
    expect(forward.confirmed).toHaveLength(1);
    expect(forward.candidates).toHaveLength(1);
    expect(forward.confirmed[0]?.id).toMatch(/^evidence:v1:[a-f0-9]{64}$/u);
    expect(forward.candidates[0]?.id).toMatch(/^evidence:v1:[a-f0-9]{64}$/u);
  });

  it('applies negative and layer filters before classification with exact counts', () => {
    const result = classifyDiscoveryRecords(
      [
        record('server/negative.ts', 'forbidden targetField = row.source_field;'),
        record('client/outside.ts', 'targetField = row.source_field;'),
        record('server/mapping.ts', 'targetField = row.source_field;'),
      ],
      {
        anchors: [],
        layers: ['server'],
        negativeTerms: [{ value: 'forbidden', caseSensitive: false }],
      },
      { DUPLICATE_LOCATION: 2, UNVERIFIED_FILE_CONTENT: 1 },
    );
    expect(result.confirmed).toHaveLength(1);
    expect(result.recordsClassified).toBe(1);
    expect(result.exclusionSummary).toEqual({
      DUPLICATE_LOCATION: 2,
      UNVERIFIED_FILE_CONTENT: 1,
      NEGATIVE_TERM_MATCH: 1,
      OUTSIDE_LAYER_HINT: 1,
    });
  });
});
