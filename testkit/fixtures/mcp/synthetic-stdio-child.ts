const scenario = process.argv[2];

function writeFrame(
  method: string,
  params: Readonly<Record<string, unknown>>,
): void {
  process.stdout.write(
    `${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`,
  );
}

if (scenario === 'stdio-clean-output') {
  writeFrame('notifications/initialized', { ready: true });
  process.exitCode = 0;
} else if (scenario === 'graceful-shutdown') {
  writeFrame('notifications/initialized', { ready: true });
  process.stdin.setEncoding('utf8');
  let input = '';
  process.stdin.on('data', (chunk: string) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    if (input.trim() !== 'shutdown') {
      process.stderr.write('Expected the shutdown command.\n');
      process.exitCode = 2;
      return;
    }
    writeFrame('notifications/cancelled', { closed: true });
    process.exitCode = 0;
  });
} else {
  process.stderr.write('Unknown synthetic lifecycle scenario.\n');
  process.exitCode = 2;
}
