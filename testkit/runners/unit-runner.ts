import { executeVitestSurface } from './run-vitest-surface.js';

await executeVitestSurface('unit', process.argv.slice(2));
