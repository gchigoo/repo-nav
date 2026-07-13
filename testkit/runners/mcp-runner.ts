import { executeVitestSurface } from './run-vitest-surface.js';

await executeVitestSurface('mcp', process.argv.slice(2));
