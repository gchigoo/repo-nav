import { spawnSync } from 'node:child_process';
import * as unitDnsModule from 'node:dns';
import * as unitDnsPromisesModule from 'node:dns/promises';
import { lookup as unitDnsLookup } from 'node:dns';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { RUNNER_SELECTIONS } from '../../testkit/runners/runner-registry.js';
import { isSelected } from '../../testkit/testing/selection.js';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

const DENY_PROBE_SOURCE = String.raw`
import * as dnsModule from 'node:dns';
import * as dnsPromisesModule from 'node:dns/promises';
import { lookup as dnsLookup, resolve4 as dnsResolve4, Resolver as DnsResolver } from 'node:dns';
import { resolve4 as dnsPromisesResolve4, Resolver as DnsPromisesResolver } from 'node:dns/promises';
import { request as httpRequest, get as httpGet } from 'node:http';
import { request as httpsRequest, get as httpsGet } from 'node:https';
import { connect as netConnect, createServer as netCreateServer, Socket as NetSocket } from 'node:net';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec, execFile, execFileSync, fork, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const results = [];
const denyPrefix = 'deny-network:';
const messageOf = (error) => error && typeof error.message === 'string' ? error.message : String(error);

const waitForConnect = (socket) => new Promise((resolveConnect, rejectConnect) => {
  socket.once('connect', () => { socket.destroy(); resolveConnect(); });
  socket.once('error', rejectConnect);
});

const recordAllowed = async (name, fn) => {
  try {
    await fn();
    results.push(name + ':allowed');
  } catch (error) {
    throw new Error(name + ' expected allowed but failed: ' + messageOf(error));
  }
};

const recordDeniedSync = (name, fn, verify = () => {}) => {
  let returned;
  try {
    returned = fn();
  } catch (error) {
    const message = messageOf(error);
    if (!message.startsWith(denyPrefix)) {
      throw new Error(name + ' threw a non-deny-network error: ' + message);
    }
    verify();
    results.push(name + ':blocked-sync');
    return;
  }
  if (returned && typeof returned.destroy === 'function') {
    returned.destroy();
  }
  throw new Error(name + ' returned before the synchronous deny-network guard');
};

const recordGuardAllowedSync = (name, fn) => {
  let returned;
  try {
    returned = fn();
  } catch (error) {
    const message = messageOf(error);
    if (message.startsWith(denyPrefix)) {
      throw new Error(name + ' was denied by the guard: ' + message);
    }
    results.push(name + ':guard-allowed');
    return;
  }
  if (returned && typeof returned.on === 'function') {
    returned.on('error', () => {});
  }
  if (returned && typeof returned.destroy === 'function') {
    returned.destroy();
  }
  results.push(name + ':guard-allowed');
};

recordDeniedSync('fetch', () => globalThis.fetch('http://127.0.0.1/'));
recordDeniedSync('http-request', () => httpRequest('http://127.0.0.1/'));
recordDeniedSync('http-get', () => httpGet('http://127.0.0.1/'));
recordDeniedSync('https-request', () => httpsRequest('https://127.0.0.1/'));
recordDeniedSync('https-get', () => httpsGet('https://127.0.0.1/'));
recordDeniedSync('dns-lookup', () => dnsLookup('example.com', () => {}));
recordDeniedSync('dns-lookup-undefined', () => dnsLookup(undefined, () => {}));
recordDeniedSync('dns-resolve4', () => dnsResolve4('example.com', () => {}));
if (typeof dnsModule.resolveTlsa === 'function') {
  recordDeniedSync('dns-resolve-tlsa', () => dnsModule.resolveTlsa('example.com', () => {}));
  recordDeniedSync('dns-resolver-resolve-tlsa', () => new DnsResolver().resolveTlsa('example.com', () => {}));
}
recordDeniedSync('dns-resolver-resolve4', () => new DnsResolver().resolve4('example.com', () => {}));
recordDeniedSync('dns-promises-resolve4', () => dnsPromisesResolve4('example.com'));
if (typeof dnsPromisesModule.resolveTlsa === 'function') {
  recordDeniedSync('dns-promises-resolve-tlsa', () => dnsPromisesModule.resolveTlsa('example.com'));
  recordDeniedSync('dns-promises-resolver-resolve-tlsa', () => new DnsPromisesResolver().resolveTlsa('example.com'));
}
recordDeniedSync('dns-promises-resolver-resolve4', () => new DnsPromisesResolver().resolve4('example.com'));
recordDeniedSync('empty-path-nonloopback-options', () => netConnect({ path: '', host: '192.0.2.1', port: 80 }));
recordDeniedSync('blank-path-nonloopback-options', () => netConnect({ path: '   ', host: '192.0.2.1', port: 80 }));

// The server binds all interfaces so a localhost default (port-callback
// overload) reaches it whether localhost resolves to 127.0.0.1 or ::1.
const server = netCreateServer();
await new Promise((resolveListen) => server.listen(0, resolveListen));
const port = server.address().port;

await recordAllowed('loopback-connect', () => waitForConnect(netConnect(port, '127.0.0.1')));
await recordAllowed('options-loopback-connect', () => waitForConnect(netConnect({ port, host: '127.0.0.1' })));
await recordAllowed('port-callback-overload', () => waitForConnect(netConnect(port, () => {})));

let customLookupIpLiteralCalled = false;
await recordAllowed('custom-lookup-ip-literal', () => waitForConnect(netConnect({
  port,
  host: '127.0.0.1',
  lookup: (_host, _options, callback) => {
    customLookupIpLiteralCalled = true;
    callback(null, '192.0.2.1', 4);
  },
})));
if (customLookupIpLiteralCalled) {
  throw new Error('custom lookup was invoked for a loopback IP literal');
}

let customLookupLocalhostCalled = false;
recordDeniedSync('custom-lookup-localhost', () => netConnect({
  port,
  host: 'localhost',
  lookup: (_host, _options, callback) => {
    customLookupLocalhostCalled = true;
    callback(null, '192.0.2.1', 4);
  },
}), () => {
  if (customLookupLocalhostCalled) {
    throw new Error('custom lookup ran before localhost denial');
  }
});

let customLookupDefaultCalled = false;
recordDeniedSync('custom-lookup-default-host', () => netConnect({
  port,
  lookup: (_host, _options, callback) => {
    customLookupDefaultCalled = true;
    callback(null, '192.0.2.1', 4);
  },
}), () => {
  if (customLookupDefaultCalled) {
    throw new Error('custom lookup ran before default-host denial');
  }
});

let accessorHostReads = 0;
const accessorHostOptions = {
  port,
  get host() {
    accessorHostReads += 1;
    return accessorHostReads === 1 ? '127.0.0.1' : '192.0.2.1';
  },
};
await recordAllowed('accessor-host-loopback', () => waitForConnect(netConnect(accessorHostOptions)));
if (accessorHostReads !== 1) {
  throw new Error('accessor host was not snapshotted exactly once');
}

let accessorLookupReads = 0;
let accessorLookupCalled = false;
const accessorLookupOptions = {
  port,
  host: 'localhost',
  get lookup() {
    accessorLookupReads += 1;
    return (_host, _options, callback) => {
      accessorLookupCalled = true;
      callback(null, '192.0.2.1', 4);
    };
  },
};
recordDeniedSync('accessor-lookup-localhost', () => netConnect(accessorLookupOptions), () => {
  if (accessorLookupReads !== 1) {
    throw new Error('accessor lookup was not snapshotted exactly once');
  }
  if (accessorLookupCalled) {
    throw new Error('accessor lookup callback ran before denial');
  }
});

let proxyHostReads = 0;
const proxyOptions = new Proxy({ port, host: '127.0.0.1' }, {
  get(target, key, receiver) {
    if (key === 'host') {
      proxyHostReads += 1;
      return proxyHostReads === 1 ? '127.0.0.1' : '192.0.2.1';
    }
    return Reflect.get(target, key, receiver);
  },
});
await recordAllowed('proxy-check-use-loopback', () => waitForConnect(netConnect(proxyOptions)));
if (proxyHostReads !== 1) {
  throw new Error('proxy host was not snapshotted exactly once');
}

let proxyUnsafeReads = 0;
const proxyUnsafeOptions = new Proxy({ port, host: '127.0.0.1' }, {
  get(target, key, receiver) {
    if (key === 'host') {
      proxyUnsafeReads += 1;
      return proxyUnsafeReads === 1 ? '192.0.2.1' : '127.0.0.1';
    }
    return Reflect.get(target, key, receiver);
  },
});
recordDeniedSync('proxy-unsafe-first-host', () => netConnect(proxyUnsafeOptions), () => {
  if (proxyUnsafeReads !== 1) {
    throw new Error('unsafe proxy host was not snapshotted exactly once');
  }
});

await recordAllowed('socket-direct-loopback', () => waitForConnect(new NetSocket().connect(port, '127.0.0.1')));
await new Promise((resolveClose) => server.close(resolveClose));

recordDeniedSync('dns-trick-connect', () => netConnect(80, '127.evil.example'));
recordDeniedSync('leading-zero-ip-connect', () => netConnect(80, '127.000.000.001'));
recordDeniedSync('nonloopback-connect', () => netConnect(80, '192.0.2.1'));
recordDeniedSync('socket-direct-nonloopback', () => new NetSocket().connect(80, '192.0.2.1'));
if (process.platform !== 'win32') {
  recordGuardAllowedSync('ip-looking-posix-ipc-path', () => netConnect('192.0.2.1'));
}

// A UNC-form remote Windows named pipe must be denied on every platform.
const BS = String.fromCharCode(92);
const remotePipePath = BS + BS + 'remote-host' + BS + 'pipe' + BS + 'repo-nav-deny-remote';
recordDeniedSync('remote-pipe-connect', () => netConnect(remotePipePath));
const extendedRemotePipePath = BS + BS + '?' + BS + 'UNC' + BS + 'remote-host' + BS + 'pipe' + BS + 'repo-nav-deny-remote';
recordDeniedSync('extended-unc-remote-pipe-connect', () => netConnect(extendedRemotePipePath));
const localExtendedPipePath = BS + BS + '?' + BS + 'pipe' + BS + 'repo-nav-deny-local';
recordGuardAllowedSync('local-extended-pipe-connect', () => netConnect(localExtendedPipePath));
const localExtendedUncPipePath = BS + BS + '?' + BS + 'UNC' + BS + 'localhost' + BS + 'pipe' + BS + 'repo-nav-deny-local';
recordGuardAllowedSync('extended-unc-local-pipe-connect', () => netConnect(localExtendedUncPipePath));

let accessorPathReads = 0;
const accessorPathOptions = {
  get path() {
    accessorPathReads += 1;
    return remotePipePath;
  },
};
recordDeniedSync('accessor-path-remote-pipe', () => netConnect(accessorPathOptions), () => {
  if (accessorPathReads !== 1) {
    throw new Error('accessor path was not snapshotted exactly once');
  }
});

// Cross-platform IPC: Windows Node IPC requires a named pipe path
// (\\.\pipe\...); POSIX uses a Unix socket path in a temp directory.
const ipcDirectory = mkdtempSync(join(tmpdir(), 'repo-nav-deny-ipc-'));
const ipcPath = process.platform === 'win32'
  ? BS + BS + '.' + BS + 'pipe' + BS + 'repo-nav-deny-' + process.pid + '-' + Date.now()
  : join(ipcDirectory, 'socket');
const ipcServer = netCreateServer();
await new Promise((resolveListen) => ipcServer.listen(ipcPath, resolveListen));
await recordAllowed('ipc-connect', () => waitForConnect(netConnect(ipcPath)));
await new Promise((resolveClose) => ipcServer.close(resolveClose));
rmSync(ipcDirectory, { recursive: true, force: true });

await recordAllowed('filesystem', () => readFileSync(fileURLToPath(import.meta.url), 'utf8'));
await recordAllowed('child-process', () => {
  const result = spawnSync(process.execPath, ['-e', 'process.exit(0)'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('child failed');
});
await recordAllowed('child-process-guard-inheritance', () => {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      "require('node:dns').lookup('example.com',()=>{}); process.exit(2)",
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '' },
    },
  );
  if (
    result.status === 0 ||
    !result.stderr.includes('deny-network: node:dns lookup')
  ) {
    throw new Error('child did not inherit synchronous deny-network guard');
  }
});

const overloadDirectory = mkdtempSync(join(tmpdir(), 'repo-nav-deny-overload-'));
const markerPath = join(overloadDirectory, 'marker.txt');
const exitPath = join(overloadDirectory, 'exit.cjs');
const outputPath = join(overloadDirectory, 'output.cjs');
const failurePath = join(overloadDirectory, 'failure.cjs');
const collisionImportPath = join(overloadDirectory, 'not-deny-network.mjs');
const forkPath = join(overloadDirectory, 'fork.cjs');
writeFileSync(
  exitPath,
  "process.exit((process.env.NODE_OPTIONS||'').includes('deny-network.mjs')?0:3)",
  'utf8',
);
writeFileSync(
  outputPath,
  "process.stdout.write((process.env.NODE_OPTIONS||'').includes('deny-network.mjs')?'guarded':'unguarded');process.stderr.write('stderr')",
  'utf8',
);
writeFileSync(
  failurePath,
  "process.stdout.write('failure-stdout');process.stderr.write('failure-stderr');process.exit(7)",
  'utf8',
);
writeFileSync(collisionImportPath, '', 'utf8');
writeFileSync(forkPath, "require('node:fs').writeFileSync(process.env.MARKER,'fork')", 'utf8');
const overloadEnv = {
  ...process.env,
  MARKER: markerPath,
  NODE_OPTIONS: '--require=' + JSON.stringify(exitPath),
};
const outputEnv = { ...process.env, NODE_OPTIONS: '' };
const outputCommand = JSON.stringify(process.execPath) + ' ' + JSON.stringify(outputPath);
const forkEnv = { ...process.env, MARKER: markerPath, NODE_OPTIONS: '' };
const waitForSuccessfulChild = (child, message) => new Promise((resolveChild, rejectChild) => {
  child.once('error', rejectChild);
  child.once('exit', (status) => status === 0 ? resolveChild() : rejectChild(new Error(message)));
});
const assertOutput = (stdout, stderr, message) => {
  if (stdout !== 'guarded' || stderr !== 'stderr') {
    throw new Error(message + ': ' + JSON.stringify({ stdout, stderr }));
  }
};
const assertPromisifiedFailure = async (promise, name) => {
  if (!promise.child || typeof promise.child.pid !== 'number') {
    throw new Error(name + ' did not expose its child');
  }
  try {
    await promise;
  } catch (error) {
    if (
      !error ||
      error.code !== 7 ||
      error.stdout !== 'failure-stdout' ||
      error.stderr !== 'failure-stderr'
    ) {
      throw new Error(name + ' rejection mismatch: ' + messageOf(error));
    }
    return;
  }
  throw new Error(name + ' unexpectedly resolved');
};
await recordAllowed('child-process-guard-name-collision', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "require('node:dns').lookup('example.com',()=>{}); process.exit(2)"],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_OPTIONS:
          '--import=' + JSON.stringify(pathToFileURL(collisionImportPath).href),
      },
    },
  );
  if (
    result.status === 0 ||
    !result.stderr.includes('deny-network: node:dns lookup')
  ) {
    throw new Error('guard-name collision suppressed child guard injection');
  }
});
await recordAllowed('spawn-undefined-args-options', () => new Promise((resolveChild, rejectChild) => {
  const child = spawn(process.execPath, undefined, {
    env: overloadEnv,
    stdio: 'ignore',
  });
  child.once('error', rejectChild);
  child.once('exit', (status) => status === 0 ? resolveChild() : rejectChild(new Error('spawn overload failed')));
}));
await recordAllowed('spawn-sync-undefined-args-options', () => {
  const result = spawnSync(process.execPath, undefined, {
    encoding: 'utf8',
    env: overloadEnv,
  });
  if (result.status !== 0) throw new Error('spawnSync overload failed');
});
await recordAllowed('exec-file-undefined-args-options', () => new Promise((resolveChild, rejectChild) => {
  execFile(process.execPath, undefined, { env: overloadEnv }, (error) => {
    if (error) rejectChild(error); else resolveChild();
  });
}));
await recordAllowed('exec-file-undefined-args-options-no-callback', () =>
  waitForSuccessfulChild(
    execFile(process.execPath, undefined, { env: overloadEnv }),
    'execFile undefined no-callback overload failed',
  ),
);
await recordAllowed('exec-file-null-args-options', () => new Promise((resolveChild, rejectChild) => {
  execFile(process.execPath, null, { env: overloadEnv }, (error) => {
    if (error) rejectChild(error); else resolveChild();
  });
}));
await recordAllowed('exec-file-null-args-options-no-callback', () =>
  waitForSuccessfulChild(
    execFile(process.execPath, null, { env: overloadEnv }),
    'execFile null no-callback overload failed',
  ),
);
await recordAllowed('exec-file-options-second', () => new Promise((resolveChild, rejectChild) => {
  execFile(process.execPath, { env: overloadEnv }, (error) => {
    if (error) rejectChild(error); else resolveChild();
  });
}));
await recordAllowed('exec-file-options-second-no-callback', () =>
  waitForSuccessfulChild(
    execFile(process.execPath, { env: overloadEnv }),
    'execFile options-second no-callback overload failed',
  ),
);
await recordAllowed('exec-file-args-array', () => new Promise((resolveChild, rejectChild) => {
  execFile(
    process.execPath,
    [outputPath],
    { encoding: 'utf8', env: outputEnv },
    (error, stdout, stderr) => {
      if (error) rejectChild(error);
      else {
        try {
          assertOutput(stdout, stderr, 'execFile args-array output mismatch');
          resolveChild();
        } catch (outputError) {
          rejectChild(outputError);
        }
      }
    },
  );
}));
await recordAllowed('exec-command-callback', () => new Promise((resolveChild, rejectChild) => {
  exec(outputCommand, (error, stdout, stderr) => {
    if (error) rejectChild(error);
    else {
      try {
        assertOutput(stdout, stderr, 'exec command-callback output mismatch');
        resolveChild();
      } catch (outputError) {
        rejectChild(outputError);
      }
    }
  });
}));
await recordAllowed('exec-options-callback', () => new Promise((resolveChild, rejectChild) => {
  exec(outputCommand, { encoding: 'utf8', env: outputEnv }, (error, stdout, stderr) => {
    if (error) rejectChild(error);
    else {
      try {
        assertOutput(stdout, stderr, 'exec options-callback output mismatch');
        resolveChild();
      } catch (outputError) {
        rejectChild(outputError);
      }
    }
  });
}));
await recordAllowed('exec-command-no-callback', () =>
  waitForSuccessfulChild(exec(outputCommand), 'exec command-only overload failed'),
);
await recordAllowed('exec-options-no-callback', () =>
  waitForSuccessfulChild(
    exec(outputCommand, { env: outputEnv }),
    'exec options no-callback overload failed',
  ),
);
await recordAllowed('promisified-exec', async () => {
  const promise = promisify(exec)(outputCommand, { encoding: 'utf8', env: outputEnv });
  if (!promise.child || typeof promise.child.pid !== 'number') {
    throw new Error('promisified exec did not expose its child');
  }
  const { stdout, stderr } = await promise;
  assertOutput(stdout, stderr, 'promisified exec output mismatch');
});
await recordAllowed('promisified-exec-file-args-array', async () => {
  const promise = promisify(execFile)(
    process.execPath,
    [outputPath],
    { encoding: 'utf8', env: outputEnv },
  );
  if (!promise.child || typeof promise.child.pid !== 'number') {
    throw new Error('promisified execFile args-array did not expose its child');
  }
  const { stdout, stderr } = await promise;
  assertOutput(stdout, stderr, 'promisified execFile args-array output mismatch');
});
await recordAllowed('promisified-exec-file-options-second', async () => {
  const promise = promisify(execFile)(process.execPath, { env: overloadEnv });
  if (!promise.child || typeof promise.child.pid !== 'number') {
    throw new Error('promisified execFile options-second did not expose its child');
  }
  await promise;
});
await recordAllowed('promisified-exec-file-null-args', async () => {
  const promise = promisify(execFile)(process.execPath, null, { env: overloadEnv });
  if (!promise.child || typeof promise.child.pid !== 'number') {
    throw new Error('promisified execFile null-args did not expose its child');
  }
  await promise;
});
await recordAllowed('promisified-exec-rejection', () =>
  assertPromisifiedFailure(
    promisify(exec)(
      JSON.stringify(process.execPath) + ' ' + JSON.stringify(failurePath),
      { encoding: 'utf8', env: outputEnv },
    ),
    'promisified exec rejection',
  ),
);
await recordAllowed('promisified-exec-file-rejection', () =>
  assertPromisifiedFailure(
    promisify(execFile)(
      process.execPath,
      [failurePath],
      { encoding: 'utf8', env: outputEnv },
    ),
    'promisified execFile rejection',
  ),
);
await recordAllowed('exec-file-sync-undefined-args-options', () => {
  execFileSync(process.execPath, undefined, { env: overloadEnv });
});
await recordAllowed('fork-undefined-args-options', () => new Promise((resolveChild, rejectChild) => {
  const child = fork(forkPath, undefined, {
    env: forkEnv,
    silent: true,
  });
  child.once('error', rejectChild);
  child.once('exit', (status) => status === 0 ? resolveChild() : rejectChild(new Error('fork overload failed')));
}));
if (!existsSync(markerPath) || readFileSync(markerPath, 'utf8') !== 'fork') {
  throw new Error('fork overload options were not preserved');
}
rmSync(overloadDirectory, { recursive: true, force: true });

process.stdout.write(results.sort().join('\n'));
`;

function withoutDenyNetworkImport(
  nodeOptions: string | undefined,
): string | undefined {
  if (nodeOptions === undefined) {
    return undefined;
  }
  const tokens = nodeOptions
    .split(/\s+/u)
    .filter((token) => token.length > 0 && !token.includes('deny-network'));
  return tokens.length === 0 ? undefined : tokens.join(' ');
}

describe.runIf(
  isSelected({
    group: 'hermetic-test-surface',
    caseId: 'deny-network-enforcement',
  }),
)('A6-HERMETIC-001 deny-network enforcement', () => {
  it('blocks fetch/http/https, direct DNS, empty-path TCP fallback, DNS-prefix tricks, custom-lookup redirection, non-loopback net, direct Socket.connect, and remote pipes synchronously while allowing fs, child_process, loopback, and local IPC', () => {
    expect(process.env.NODE_OPTIONS).toContain('deny-network.mjs');
    expect(() => unitDnsLookup('example.com', () => {})).toThrow(
      /^deny-network:/u,
    );
    const denyModule = resolve(
      repositoryRoot,
      'testkit/testing/deny-network.mjs',
    );
    const directory = mkdtempSync(resolve(tmpdir(), 'repo-nav-deny-probe-'));
    const probePath = resolve(directory, 'probe.mjs');
    try {
      writeFileSync(probePath, DENY_PROBE_SOURCE, 'utf8');
      const result = spawnSync(
        process.execPath,
        ['--import', pathToFileURL(denyModule).href, probePath],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          timeout: 30_000,
          env: {
            ...process.env,
            NODE_OPTIONS: withoutDenyNetworkImport(process.env.NODE_OPTIONS),
          },
        },
      );
      expect(result.status, result.stderr).toBe(0);
      const observed = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .sort();
      const expected = [
        'accessor-host-loopback:allowed',
        'accessor-lookup-localhost:blocked-sync',
        'accessor-path-remote-pipe:blocked-sync',
        'blank-path-nonloopback-options:blocked-sync',
        'child-process:allowed',
        'child-process-guard-inheritance:allowed',
        'child-process-guard-name-collision:allowed',
        'exec-command-callback:allowed',
        'exec-command-no-callback:allowed',
        'exec-file-args-array:allowed',
        'exec-file-null-args-options:allowed',
        'exec-file-null-args-options-no-callback:allowed',
        'exec-file-options-second:allowed',
        'exec-file-options-second-no-callback:allowed',
        'exec-file-sync-undefined-args-options:allowed',
        'exec-file-undefined-args-options:allowed',
        'exec-file-undefined-args-options-no-callback:allowed',
        'exec-options-callback:allowed',
        'exec-options-no-callback:allowed',
        'fork-undefined-args-options:allowed',
        'promisified-exec:allowed',
        'promisified-exec-file-args-array:allowed',
        'promisified-exec-file-null-args:allowed',
        'promisified-exec-file-options-second:allowed',
        'promisified-exec-file-rejection:allowed',
        'promisified-exec-rejection:allowed',
        'spawn-sync-undefined-args-options:allowed',
        'spawn-undefined-args-options:allowed',
        'custom-lookup-default-host:blocked-sync',
        'custom-lookup-ip-literal:allowed',
        'custom-lookup-localhost:blocked-sync',
        'dns-lookup:blocked-sync',
        'dns-lookup-undefined:blocked-sync',
        'dns-promises-resolve4:blocked-sync',
        'dns-promises-resolver-resolve4:blocked-sync',
        'dns-resolve4:blocked-sync',
        'dns-resolver-resolve4:blocked-sync',
        'dns-trick-connect:blocked-sync',
        'empty-path-nonloopback-options:blocked-sync',
        'extended-unc-local-pipe-connect:guard-allowed',
        'extended-unc-remote-pipe-connect:blocked-sync',
        'fetch:blocked-sync',
        'filesystem:allowed',
        'http-get:blocked-sync',
        'http-request:blocked-sync',
        'https-get:blocked-sync',
        'https-request:blocked-sync',
        'ipc-connect:allowed',
        'leading-zero-ip-connect:blocked-sync',
        'local-extended-pipe-connect:guard-allowed',
        'loopback-connect:allowed',
        'nonloopback-connect:blocked-sync',
        'options-loopback-connect:allowed',
        'port-callback-overload:allowed',
        'proxy-check-use-loopback:allowed',
        'proxy-unsafe-first-host:blocked-sync',
        'remote-pipe-connect:blocked-sync',
        'socket-direct-loopback:allowed',
        'socket-direct-nonloopback:blocked-sync',
      ];
      if (typeof unitDnsModule.resolveTlsa === 'function') {
        expected.push(
          'dns-resolve-tlsa:blocked-sync',
          'dns-resolver-resolve-tlsa:blocked-sync',
        );
      }
      if (typeof unitDnsPromisesModule.resolveTlsa === 'function') {
        expected.push(
          'dns-promises-resolve-tlsa:blocked-sync',
          'dns-promises-resolver-resolve-tlsa:blocked-sync',
        );
      }
      if (process.platform !== 'win32') {
        expected.push('ip-looking-posix-ipc-path:guard-allowed');
      }
      expect(observed).toEqual(expected.sort());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe.runIf(
  isSelected({
    group: 'hermetic-test-surface',
    caseId: 'integration-isolation',
  }),
)('A6-HERMETIC-002 integration isolation', () => {
  it('moves live CodeGraph smoke out of the unit surface', () => {
    expect(
      existsSync(
        resolve(repositoryRoot, 'test/unit/codegraph-live-smoke.spec.ts'),
      ),
    ).toBe(false);
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          'test/integration/codegraph-live-smoke.spec.ts',
        ),
      ),
    ).toBe(true);
    const pkg = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['test:integration:codegraph']).toBe(
      'vitest run --config vitest.integration-codegraph.config.ts',
    );
    const unit = RUNNER_SELECTIONS['unit'];
    expect(unit.groups.has('codegraph-live-smoke')).toBe(false);
    expect(unit.cases.has('indexed-temp-repo')).toBe(false);
    const integrationConfig = readFileSync(
      resolve(repositoryRoot, 'vitest.integration-codegraph.config.ts'),
      'utf8',
    );
    expect(integrationConfig).toContain(
      'test/integration/codegraph-live-smoke.spec.ts',
    );
  });
});

describe.runIf(
  isSelected({
    group: 'hermetic-test-surface',
    caseId: 'config-coverage',
  }),
)('A6-HERMETIC-003 config coverage', () => {
  it('covers root vitest*.config.ts in tsconfig, ESLint, and format:check', () => {
    const tsconfig = readFileSync(
      resolve(repositoryRoot, 'tsconfig.json'),
      'utf8',
    );
    expect(tsconfig).toContain('vitest*.config.ts');
    const eslint = readFileSync(
      resolve(repositoryRoot, 'eslint.config.mjs'),
      'utf8',
    );
    expect(eslint).toContain("'vitest*.config.ts'");
    const pkg = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['format:check'] ?? '').toContain('vitest*.config.ts');
  });
});
