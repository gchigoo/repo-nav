const denyNetworkModule = new URL(
  '../testing/deny-network.mjs',
  import.meta.url,
);
const denyNetworkOption = `--import=${denyNetworkModule.href}`;
if (!(process.env['NODE_OPTIONS'] ?? '').includes('deny-network.mjs')) {
  process.env['NODE_OPTIONS'] = [process.env['NODE_OPTIONS'], denyNetworkOption]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(' ');
}
await import(denyNetworkModule.href);

const { executeVitestSurface } = await import('./run-vitest-surface.js');
await executeVitestSurface('unit', process.argv.slice(2));
