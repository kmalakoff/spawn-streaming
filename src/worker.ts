import spawn, { crossSpawn, type SpawnError, type SpawnResult } from 'cross-spawn-cb';
import oo from 'on-one';
import Queue from 'queue-cb';
import concatWritable from './lib/concatWritable.ts';
import nextColor from './lib/nextColor.ts';
import prefixTransform from './lib/prefixTransform.ts';

import type { ColorFunction, SpawnCallback, SpawnOptions, StreamingOptions } from './types.ts';

interface CapturedOutput {
  stream: NodeJS.WritableStream;
  output: string;
}

function pipeline(input: NodeJS.ReadableStream, output: NodeJS.WritableStream, options: StreamingOptions, color: ColorFunction | null) {
  if (options.prefix && color) {
    const transform = prefixTransform(options.prefix, color) as unknown as NodeJS.ReadableStream & NodeJS.WritableStream;
    input.pipe(transform);
    return transform.pipe(output);
  }
  return input.pipe(output);
}

export default function spawnStreaming(command: string, args: string[], spawnOptions: SpawnOptions, options: StreamingOptions, callback: SpawnCallback): void {
  const { encoding, stdio, ...csOptions } = spawnOptions;
  const cp = crossSpawn(command, args, csOptions);
  const color = options.prefix ? nextColor() : null;
  const outputs: { stdout: CapturedOutput | null; stderr: CapturedOutput | null } = { stdout: null, stderr: null };

  if (cp.stdout && process.stdout.getMaxListeners) {
    process.stdout.setMaxListeners(process.stdout.getMaxListeners() + 1);
    process.stderr.setMaxListeners(process.stderr.getMaxListeners() + 1);
  }

  const queue = new Queue();
  if (cp.stdout) {
    if (stdio === 'inherit') pipeline(cp.stdout, process.stdout, options, color);
    else {
      const captured: CapturedOutput = { stream: null as unknown as NodeJS.WritableStream, output: '' };
      captured.stream = concatWritable((output) => {
        captured.output = output.toString(encoding || 'utf8');
      });
      outputs.stdout = captured;
      const stdout = cp.stdout;
      queue.defer((cb) => oo(pipeline(stdout, captured.stream, options, color), ['error', 'end', 'close', 'finish'], (err: Error | null) => cb(err)));
    }
  }
  if (cp.stderr) {
    if (stdio === 'inherit') pipeline(cp.stderr, process.stderr, options, color);
    else {
      const captured: CapturedOutput = { stream: null as unknown as NodeJS.WritableStream, output: '' };
      captured.stream = concatWritable((output) => {
        captured.output = output.toString(encoding || 'utf8');
      });
      outputs.stderr = captured;
      const stderr = cp.stderr;
      queue.defer((cb) => oo(pipeline(stderr, captured.stream, options, color), ['error', 'end', 'close', 'finish'], (err: Error | null) => cb(err)));
    }
  }
  queue.defer(spawn.worker.bind(null, cp, csOptions));
  queue.await((err?: Error | null) => {
    if (cp.stdout && process.stdout.getMaxListeners) {
      process.stdout.setMaxListeners(process.stdout.getMaxListeners() - 1);
      process.stderr.setMaxListeners(process.stderr.getMaxListeners() - 1);
    }

    const spawnErr = err as SpawnError | null;
    const res = (spawnErr ? spawnErr : {}) as SpawnResult;
    res.stdout = (outputs.stdout ? outputs.stdout.output : null) as string | Buffer;
    res.stderr = (outputs.stderr ? outputs.stderr.output : null) as string | Buffer;
    res.output = [res.stdout, res.stderr, null];
    spawnErr ? callback(spawnErr) : callback(undefined, res);
  });
}
