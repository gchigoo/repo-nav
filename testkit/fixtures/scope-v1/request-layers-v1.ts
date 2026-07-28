import type { RepoLayer } from '../../../src/contracts/index.js';

export const REQUEST_LAYERS_V1 = Object.freeze({
  missing: undefined,
  empty: Object.freeze([] as const),
  duplicates: Object.freeze(['server', 'server', 'client'] as const),
  permutation: Object.freeze(['unknown', 'test', 'client'] as const),
  all: Object.freeze([
    'client',
    'server',
    'db',
    'test',
    'docs',
    'config',
    'unknown',
  ] as const satisfies readonly RepoLayer[]),
  defaultEffective: Object.freeze([
    'client',
    'server',
    'db',
    'config',
    'unknown',
  ] as const),
} as const);
