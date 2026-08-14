import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import { isSelected } from '../../testkit/testing/selection.js';

const selected = isSelected({
  group: 'canonical-locate-bridge',
  caseId: 'canonical-package-declaration-boundary',
});

describe.runIf(selected)('F1C-PACKAGE-001 package declaration boundary', () => {
  it('does not export concrete engine or private bridge symbols from package root', () => {
    const root = resolve(import.meta.dirname, '..', '..');
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(index).not.toMatch(/repository-evidence-engine/u);
    expect(index).not.toMatch(/locate-execution/u);
    expect(index).not.toMatch(/canonical\//u);
    expect(index).not.toMatch(/locate-fact-envelope-v2/u);

    const temp = mkdtempSync(resolve(tmpdir(), 'repo-nav-package-boundary-'));
    try {
      const outDir = resolve(temp, 'out');
      const program = ts.createProgram({
        rootNames: [resolve(root, 'src/index.ts')],
        options: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.NodeNext,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          strict: true,
          skipLibCheck: true,
          declaration: true,
          emitDeclarationOnly: true,
          noEmitOnError: true,
          outDir,
          rootDir: resolve(root, 'src'),
          types: ['node'],
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          useDefineForClassFields: false,
          isolatedModules: true,
        },
      });
      expect(ts.getPreEmitDiagnostics(program)).toEqual([]);
      const emitResult = program.emit();
      expect(emitResult.emitSkipped).toBe(false);
      const declaration = readFileSync(resolve(outDir, 'index.d.ts'), 'utf8');
      expect(declaration).not.toMatch(/RepositoryEvidenceEngine/u);
      expect(declaration).not.toMatch(/LocateExecutionTokenV2/u);
      expect(declaration).not.toMatch(/TrustedFinalizedLocateFactsV2/u);
      expect(declaration).not.toMatch(/V2ShadowLocateProjector/u);
      expect(declaration).not.toMatch(/CANONICAL_LOCATE_EXECUTOR_V2/u);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
