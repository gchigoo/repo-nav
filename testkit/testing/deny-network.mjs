/**
 * deny-network.mjs — hermetic unit child-tree network blocker.
 *
 * Loaded via `NODE_OPTIONS=--import=./testkit/testing/deny-network.mjs` so every
 * process in the unit child tree (runner, Vitest workers, spawned helpers) fails
 * fixedly on network access while filesystem, child_process, and in-memory MCP
 * transports remain usable.
 *
 * Blocked (denied SYNCHRONOUSLY before any dialing):
 *   - global `fetch`
 *   - `node:http` request/get
 *   - `node:https` request/get
 *   - direct `node:dns` and `node:dns/promises` lookup/resolve/reverse APIs
 *   - non-loopback TCP via `node:net` connect / createConnection, including
 *     direct `new net.Socket().connect(...)`
 *   - hosts that merely LOOK like loopback (e.g. `127.evil.example`,
 *     `localhost.evil.com`, `127.999.0.1`, `127.0.0.1.evil`,
 *     `127.000.000.001`) — loopback is decided by exact canonical IP
 *     literal/localhost semantics aligned with `net.isIP`, never a string
 *     prefix
 *   - a caller-supplied custom `lookup` on a non-loopback-IP-literal host
 *     (`localhost` or the default host) — such a lookup could resolve an
 *     allowed hostname onto a non-loopback address; it is allowed only for
 *     canonical loopback IP literals (127/8, `::1`, `::ffff:127.x.y.z`) that
 *     Node dials directly without resolving
 *   - empty/blank `options.path` values that Node would not treat as IPC
 *   - remote Windows named pipes (`\\host\pipe\name` with a non-local server),
 *     including extended UNC remote pipe paths (`\\?\UNC\host\pipe\name`)
 *
 * Allowed:
 *   - filesystem (`node:fs`)
 *   - `child_process` (`node:child_process`); child Node processes inherit the
 *     guard through `NODE_OPTIONS`
 *   - real loopback TCP by exact IP semantics (127/8, `localhost`, `::1`)
 *   - local IPC / named-pipe connections (POSIX sockets and Windows local
 *     pipes `\\.\pipe\...`, `\\?\pipe\...`, `\\localhost\...`), including
 *     public string-first paths that look like IP literals
 *
 * Authorization is bound to the exact target Node dials: connect options are
 * snapshotted ONCE into a plain object, that snapshot is authorized, and the
 * SAME snapshot is passed to the native operation. Getters/Proxies therefore
 * cannot present a safe value to the guard and an unsafe value to the dial.
 *
 * Patching the CommonJS exports object (via createRequire) also redirects ESM
 * named imports (`import { request } from 'node:http'`) because Node reads
 * builtin named exports through the underlying CJS module object. The patch is
 * idempotent: importing the module twice simply re-applies the same guards.
 */
import { createRequire, syncBuiltinESMExports } from 'node:module';

const require = createRequire(import.meta.url);
const childProcess = require('node:child_process');
const dns = require('node:dns');
const dnsPromises = require('node:dns/promises');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const customPromisify = require('node:util').promisify.custom;

function throwDenied(channel, detail) {
  throw new Error(
    `deny-network: ${channel} disabled for hermetic unit tests${
      detail === undefined ? '' : ` (${detail})`
    }`,
  );
}

const denyNetworkNodeOption = `--import=${import.meta.url}`;

function environmentWithGuard(environment) {
  const guarded = { ...(environment ?? process.env) };
  const nodeOptions = guarded.NODE_OPTIONS ?? '';
  const hasExactGuardImport = nodeOptions
    .split(/\s+/u)
    .includes(denyNetworkNodeOption);
  if (!hasExactGuardImport) {
    guarded.NODE_OPTIONS = [nodeOptions, denyNetworkNodeOption]
      .filter((value) => value.length > 0)
      .join(' ');
  }
  return guarded;
}

function optionsWithGuard(options) {
  if (options === undefined || options === null) {
    return { env: environmentWithGuard(undefined) };
  }
  if (typeof options !== 'object' || Array.isArray(options)) {
    return options;
  }
  return { ...options, env: environmentWithGuard(options.env) };
}

function isCanonicalIpv4Octet(part) {
  if (!/^\d{1,3}$/u.test(part)) {
    return false;
  }
  if (part.length > 1 && part.startsWith('0')) {
    // No leading zeros: 127.000.000.001 is not a canonical literal.
    return false;
  }
  return Number(part) <= 255;
}

function isCanonicalLoopbackIpv4(value) {
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== '127') {
    return false;
  }
  return parts.every(isCanonicalIpv4Octet);
}

/**
 * Whether the host is a CANONICAL loopback IP literal that Node dials directly
 * without resolving (`net.isIP(host) !== 0`). Non-canonical spellings such as
 * `127.000.000.001` return `net.isIP(...) === 0` (Node treats them as
 * hostnames) and are denied, so neither a custom nor the default lookup can
 * ever resolve them off-loopback.
 */
function isLoopbackIpLiteral(host) {
  if (typeof host !== 'string' || net.isIP(host) === 0) {
    return false;
  }
  const normalized = host.toLowerCase();
  if (normalized === '::1') {
    return true;
  }
  const MAPPED_PREFIX = '::ffff:';
  const candidate = normalized.startsWith(MAPPED_PREFIX)
    ? normalized.slice(MAPPED_PREFIX.length)
    : normalized;
  return isCanonicalLoopbackIpv4(candidate);
}

/**
 * Exact loopback semantics. `undefined`/`null` means the default host
 * (`localhost`). A string is loopback ONLY as `localhost` or a canonical
 * loopback IP literal.
 */
function isLoopbackHost(host) {
  if (host === undefined || host === null) {
    // net.connect(port) defaults to 'localhost'.
    return true;
  }
  if (typeof host !== 'string') {
    return false;
  }
  if (host.toLowerCase() === 'localhost') {
    return true;
  }
  return isLoopbackIpLiteral(host);
}

function isExplicitLoopbackHost(host) {
  return typeof host === 'string' && isLoopbackHost(host);
}

/**
 * A Windows named pipe path in UNC form (`\\server\pipe\name`) naming a
 * REMOTE server. Local pipe forms — `\\.\pipe\name`, `\\?\pipe\name`,
 * `\\localhost\pipe\name`, `\\127.x.y.z\pipe\name` — are local IPC and stay
 * allowed. Extended UNC remote pipes (`\\?\UNC\server\pipe\name`) carry a
 * real remote authority and are denied unless that authority is local.
 * Applied on every platform so a UNC-form path cannot slip through on a POSIX
 * host either; ordinary POSIX socket paths never start with `\\`.
 */
function isLocalWindowsPipeServer(server) {
  const normalized = server.toLowerCase();
  return (
    normalized === '' ||
    normalized === '.' ||
    normalized === 'localhost' ||
    normalized === '::1' ||
    isCanonicalLoopbackIpv4(normalized)
  );
}

function isRemoteWindowsPipePath(path) {
  if (typeof path !== 'string' || !path.startsWith('\\\\')) {
    return false;
  }
  const parts = path.slice(2).split('\\');
  const server = parts[0] ?? '';
  if (server.toLowerCase() === '?') {
    if ((parts[1] ?? '').toLowerCase() !== 'unc') {
      return false;
    }
    return !isLocalWindowsPipeServer(parts[2] ?? '');
  }
  return !isLocalWindowsPipeServer(server);
}

/**
 * Read every own enumerable property of a connect options object exactly once
 * into a plain object. A getter/Proxy cannot present one value to the guard
 * and another to the native dial: the guard authorizes THIS snapshot and the
 * native call receives the same snapshot.
 */
function snapshotOptionsOnce(source) {
  const snapshot = {};
  for (const key of Object.keys(source)) {
    snapshot[key] = source[key];
  }
  return Object.freeze(snapshot);
}

function assertConnectAllowed(target) {
  if (target.ipc) {
    if (
      typeof target.path === 'string' &&
      isRemoteWindowsPipePath(target.path)
    ) {
      throwDenied('node:net connect (remote Windows named pipe)', target.path);
    }
    return;
  }
  if (target.lookup !== undefined && !isLoopbackIpLiteral(target.host)) {
    throwDenied(
      'node:net connect (custom lookup)',
      String(target.host ?? '<default localhost>'),
    );
  }
  if (!isLoopbackHost(target.host)) {
    throwDenied('node:net connect', String(target.host));
  }
}

/**
 * Normalize the connect overloads shared by `net.connect`,
 * `net.createConnection`, and `Socket.prototype.connect`, authorizing the
 * exact target Node will dial:
 *   - connect(options[, listener]) — options snapshotted once;
 *   - connect(path[, listener]) — public string-first calls are IPC paths,
 *     even when the path text looks like an IP literal;
 *   - connect(port[, host][, listener]) / connect(port, listener);
 *   - Node-internal normalized arrays (`Socket.connect(normalizedArgs)`) are
 *     re-authorized and rebuilt with a snapshotted options object.
 * Returns the argument list to pass to the native operation: for the options
 * form it is the authorized plain snapshot (plus the trailing listener).
 */
function authorizeSnapshot(snapshot) {
  const hasPath = typeof snapshot.path === 'string';
  const hasNonBlankPath = hasPath && snapshot.path.trim().length > 0;
  if (hasPath && !hasNonBlankPath) {
    throwDenied('node:net connect (empty IPC path)', '<empty path>');
  }
  const target = {
    ipc: hasNonBlankPath,
    path: hasNonBlankPath ? snapshot.path : undefined,
    host: snapshot.host,
    lookup: typeof snapshot.lookup === 'function' ? snapshot.lookup : undefined,
  };
  assertConnectAllowed(target);
}

function authorizeConnectArgs(args) {
  const first = args[0];
  if (Array.isArray(first)) {
    const options = first[0];
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options)
    ) {
      throwDenied('node:net connect', '<invalid normalized arguments>');
    }
    const snapshot = snapshotOptionsOnce(options);
    authorizeSnapshot(snapshot);
    const normalized = [snapshot, ...first.slice(1)];
    for (const symbol of Object.getOwnPropertySymbols(first)) {
      Object.defineProperty(
        normalized,
        symbol,
        Object.getOwnPropertyDescriptor(first, symbol),
      );
    }
    return [Object.freeze(normalized)];
  }
  if (first !== null && typeof first === 'object') {
    const snapshot = snapshotOptionsOnce(first);
    authorizeSnapshot(snapshot);
    return [snapshot, ...args.slice(1)];
  }
  if (typeof first === 'string') {
    const target = {
      ipc: true,
      path: first,
      host: undefined,
      lookup: undefined,
    };
    assertConnectAllowed(target);
    return args;
  }
  // connect(port[, host][, listener]) / connect(port, listener).
  const host = args[1];
  const target = {
    ipc: false,
    path: undefined,
    host: typeof host === 'function' ? undefined : host,
    lookup: undefined,
  };
  assertConnectAllowed(target);
  return args;
}

const originalNetConnect = net.connect;
const originalSocketConnect = net.Socket.prototype.connect;

const DNS_METHODS = [
  'lookupService',
  'resolve',
  'resolve4',
  'resolve6',
  'resolveAny',
  'resolveCaa',
  'resolveCname',
  'resolveMx',
  'resolveNaptr',
  'resolveNs',
  'resolvePtr',
  'resolveSoa',
  'resolveSrv',
  'resolveTlsa',
  'resolveTxt',
  'reverse',
];

function patchDnsMethods(target, channelPrefix) {
  for (const method of DNS_METHODS) {
    if (typeof target?.[method] !== 'function') {
      continue;
    }
    target[method] = function denyDnsOperation() {
      throwDenied(`${channelPrefix} ${method}`);
    };
  }
}

patchDnsMethods(dns, 'node:dns');
patchDnsMethods(dns.Resolver?.prototype, 'node:dns Resolver');
patchDnsMethods(dnsPromises, 'node:dns/promises');
patchDnsMethods(dnsPromises.Resolver?.prototype, 'node:dns/promises Resolver');

const originalDnsLookup = dns.lookup;
const originalDnsPromisesLookup = dnsPromises.lookup;
dns.lookup = function guardedDnsLookup(hostname, ...args) {
  if (!isExplicitLoopbackHost(hostname)) {
    throwDenied('node:dns lookup', String(hostname));
  }
  return originalDnsLookup.call(this, hostname, ...args);
};
dnsPromises.lookup = function guardedDnsPromisesLookup(hostname, ...args) {
  if (!isExplicitLoopbackHost(hostname)) {
    throwDenied('node:dns/promises lookup', String(hostname));
  }
  return originalDnsPromisesLookup.call(this, hostname, ...args);
};

http.request = function denyHttpRequest() {
  throwDenied('node:http request');
};
http.get = function denyHttpGet() {
  throwDenied('node:http get');
};
https.request = function denyHttpsRequest() {
  throwDenied('node:https request');
};
https.get = function denyHttpsGet() {
  throwDenied('node:https get');
};

net.connect = function denyNetConnect(...args) {
  const authorized = authorizeConnectArgs(args);
  return originalNetConnect.apply(this, authorized);
};
// net.createConnection is an alias of connect in Node; route it through the guard.
net.createConnection = net.connect;

// Patch the prototype directly so `new net.Socket().connect(...)` cannot
// bypass the guard. For allowed targets the pre-patch implementation runs;
// this guard is the only patched layer, so there is no recursion.
net.Socket.prototype.connect = function denySocketConnect(...args) {
  const authorized = authorizeConnectArgs(args);
  return originalSocketConnect.apply(this, authorized);
};

globalThis.fetch = function denyFetch() {
  throwDenied('global fetch');
};

const originalSpawn = childProcess.spawn;
const originalSpawnSync = childProcess.spawnSync;
const originalExec = childProcess.exec;
const originalExecFile = childProcess.execFile;
const originalExecFileSync = childProcess.execFileSync;
const originalExecSync = childProcess.execSync;
const originalFork = childProcess.fork;

childProcess.spawn = function guardedSpawn(command, args, options) {
  if (Array.isArray(args)) {
    return originalSpawn.call(this, command, args, optionsWithGuard(options));
  }
  if (arguments.length >= 3) {
    return originalSpawn.call(this, command, [], optionsWithGuard(options));
  }
  return originalSpawn.call(this, command, optionsWithGuard(args));
};
childProcess.spawnSync = function guardedSpawnSync(command, args, options) {
  if (Array.isArray(args)) {
    return originalSpawnSync.call(
      this,
      command,
      args,
      optionsWithGuard(options),
    );
  }
  if (arguments.length >= 3) {
    return originalSpawnSync.call(this, command, [], optionsWithGuard(options));
  }
  return originalSpawnSync.call(this, command, optionsWithGuard(args));
};
childProcess.exec = function guardedExec(command, options, callback) {
  if (typeof options === 'function') {
    return originalExec.call(
      this,
      command,
      optionsWithGuard(undefined),
      options,
    );
  }
  return originalExec.call(this, command, optionsWithGuard(options), callback);
};
childProcess.execFile = function guardedExecFile(
  file,
  args,
  options,
  callback,
) {
  if (typeof args === 'function') {
    return originalExecFile.call(
      this,
      file,
      [],
      optionsWithGuard(undefined),
      args,
    );
  }
  if (!Array.isArray(args)) {
    if (arguments.length >= 4) {
      return originalExecFile.call(
        this,
        file,
        [],
        optionsWithGuard(options),
        callback,
      );
    }
    if ((args === undefined || args === null) && arguments.length >= 3) {
      if (typeof options === 'function') {
        return originalExecFile.call(
          this,
          file,
          [],
          optionsWithGuard(undefined),
          options,
        );
      }
      return originalExecFile.call(this, file, [], optionsWithGuard(options));
    }
    return originalExecFile.call(
      this,
      file,
      [],
      optionsWithGuard(args),
      options,
    );
  }
  if (typeof options === 'function') {
    return originalExecFile.call(
      this,
      file,
      args,
      optionsWithGuard(undefined),
      options,
    );
  }
  return originalExecFile.call(
    this,
    file,
    args,
    optionsWithGuard(options),
    callback,
  );
};
childProcess.execFileSync = function guardedExecFileSync(file, args, options) {
  if (Array.isArray(args)) {
    return originalExecFileSync.call(
      this,
      file,
      args,
      optionsWithGuard(options),
    );
  }
  if (arguments.length >= 3) {
    return originalExecFileSync.call(this, file, [], optionsWithGuard(options));
  }
  return originalExecFileSync.call(this, file, [], optionsWithGuard(args));
};
childProcess.execSync = function guardedExecSync(command, options) {
  return originalExecSync.call(this, command, optionsWithGuard(options));
};
childProcess.fork = function guardedFork(modulePath, args, options) {
  if (Array.isArray(args)) {
    return originalFork.call(this, modulePath, args, optionsWithGuard(options));
  }
  if (arguments.length >= 3) {
    return originalFork.call(this, modulePath, [], optionsWithGuard(options));
  }
  return originalFork.call(this, modulePath, [], optionsWithGuard(args));
};

function childProcessPromise(invoke) {
  let child;
  const promise = new Promise((resolve, reject) => {
    child = invoke((error, stdout, stderr) => {
      if (error !== null) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
  promise.child = child;
  return promise;
}

Object.defineProperty(childProcess.exec, customPromisify, {
  configurable: false,
  enumerable: false,
  writable: false,
  value(command, options) {
    return childProcessPromise((callback) =>
      childProcess.exec(command, options, callback),
    );
  },
});

Object.defineProperty(childProcess.execFile, customPromisify, {
  configurable: false,
  enumerable: false,
  writable: false,
  value(file, args, options) {
    return childProcessPromise((callback) => {
      if (Array.isArray(args)) {
        return childProcess.execFile(file, args, options, callback);
      }
      if (args === undefined || args === null) {
        if (options === undefined) {
          return childProcess.execFile(file, args, callback);
        }
        return childProcess.execFile(file, args, options, callback);
      }
      return childProcess.execFile(file, args, callback);
    });
  },
});

syncBuiltinESMExports();
