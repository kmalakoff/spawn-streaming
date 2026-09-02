import once from 'call-once-fn';
import spawn, { crossSpawn, type SpawnResult } from 'cross-spawn-cb';
import Queue from 'queue-cb';
import concatWritable from './lib/concatWritable';
import nextColor from './lib/nextColor';
import prefixTransform from './lib/prefixTransform';

import type { SpawnOptions, StreamingOptions } from './types';

function pipeline(input, output, options, color) {
  if (options.prefix) return input.pipe(prefixTransform(options.prefix, color)).pipe(output);
  return input.pipe(output);
}

export default function spawnStreaming(command: string, args: string[], spawnOptions: SpawnOptions, options: StreamingOptions, callback) {
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
      queue.defer((cb) => {
        const res = pipeline(cp.stdout, outputs.stdout, options, color);
        const end = once(cb);
        res.on('error', end);
        res.on('end', end);
        res.on('close', end);
        res.on('finish', end);
      });
    }
  }
  if (cp.stderr) {
    if (stdio === 'inherit') pipeline(cp.stderr, process.stderr, options, color);
    else {
      outputs.stderr = concatWritable((output) => {
        outputs.stderr.output = output.toString(encoding || 'utf8');
      });
      queue.defer((cb) => {
        const res = pipeline(cp.stderr, outputs.stderr, options, color);
        const end = once(cb);
        res.on('error', end);
        res.on('end', end);
        res.on('close', end);
        res.on('finish', end);
      });
    }
  }
  queue.defer(spawn.worker.bind(null, cp, { ...csOptions, encoding: 'utf8' }));
  queue.await((err) => {
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
