/**
 * F1C runtime reachability helper for canonical bridge dangerous edges.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const inventoryUrl = pathToFileURL(
  resolve('testkit/contracts/public-output-v2-import-inventory.ts'),
).href;

const {
  buildTypeScriptImportGraph,
  findForbiddenReachability,
  isForbiddenCanonicalBridgeRuntimeEdge,
} = await import(inventoryUrl);

const repositoryRoot = resolve('.');
const roots = [
  'src/main.ts',
  'src/index.ts',
  'src/app/create-application-context.ts',
  'src/app/app.module.ts',
  'src/evidence/evidence.module.ts',
  'src/evidence/repository-evidence-engine.ts',
  'src/mcp/mcp.module.ts',
  'src/mcp/locate-tool-output.ts',
  'src/mcp/repo-nav-mcp-server.ts',
  'src/mcp/mcp-stdio-host.ts',
  'tools/cli/main.ts',
  'tools/cli/execute.ts',
];

const graph = buildTypeScriptImportGraph(repositoryRoot);
const findings = findForbiddenReachability(
  graph,
  roots,
  isForbiddenCanonicalBridgeRuntimeEdge,
);

if (findings.length > 0) {
  console.error(JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log('canonical-locate-bridge runtime reachability: ok');
