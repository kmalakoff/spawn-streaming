import spawn, { crossSpawn, type SpawnError, type SpawnResult } from 'cross-spawn-cb';
import oo from 'on-one';
import Queue from 'queue-cb';
import concatWritable from './lib/concatWritable.ts';
import nextColor from './lib/nextColor.ts';
import prefixTransform from './lib/prefixTransform.ts';

import type { SpawnCallback, SpawnOptions, StreamingOptions } from './types.ts';

function pipeline(input, output, options, color) {
  if (options.prefix) return input.pipe(prefixTransform(options.prefix, color)).pipe(output);
  return input.pipe(output);
}

export default function spawnStreaming(command: string, args: string[], spawnOptions: SpawnOptions, options: StreamingOptions, callback: SpawnCallback): undefined {
  const { encoding, stdio, ...csOptions } = spawnOptions;
  const cp = crossSpawn(command, args, csOptions);
  const color = options.prefix ? nextColor() : null;
  const outputs = { stdout: null, stderr: null };

  if (cp.stdout && process.stdout.getMaxListeners) {
    process.stdout.setMaxListeners(process.stdout.getMaxListeners() + 1);
    process.stderr.setMaxListeners(process.stderr.getMaxListeners() + 1);
  }

  const queue = new Queue();
  if (cp.stdout) {
    if (stdio === 'inherit') pipeline(cp.stdout, process.stdout, options, color);
    else {
      outputs.stdout = concatWritable((output) => {
        outputs.stdout.output = output.toString(encoding || 'utf8');
      });
      queue.defer(oo.bind(null, pipeline(cp.stdout, outputs.stdout, options, color), ['error', 'end', 'close', 'finish']));
    }
  }
  if (cp.stderr) {
    if (stdio === 'inherit') pipeline(cp.stderr, process.stderr, options, color);
    else {
      outputs.stderr = concatWritable((output) => {
        outputs.stderr.output = output.toString(encoding || 'utf8');
      });
      queue.defer(oo.bind(null, pipeline(cp.stderr, outputs.stderr, options, color), ['error', 'end', 'close', 'finish']));
    }
  }
  queue.defer(spawn.worker.bind(null, cp, csOptions));
  queue.await((err: SpawnError) => {
    if (cp.stdout && process.stdout.getMaxListeners) {
      process.stdout.setMaxListeners(process.stdout.getMaxListeners() - 1);
      process.stderr.setMaxListeners(process.stderr.getMaxListeners() - 1);
    }

    const res = (err ? err : {}) as SpawnResult;
    res.stdout = outputs.stdout ? outputs.stdout.output : null;
    res.stderr = outputs.stderr ? outputs.stderr.output : null;
    res.output = [res.stdout, res.stderr, null];
    err ? callback(err) : callback(null, res);
  });
}
