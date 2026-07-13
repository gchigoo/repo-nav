import { executeVitestSurface } from './run-vitest-surface.js';

await executeVitestSurface('golden', process.argv.slice(2));
