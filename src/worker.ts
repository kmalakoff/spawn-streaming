import spawn, { crossSpawn, type SpawnResult } from 'cross-spawn-cb';
import eos from 'end-of-stream';
import Queue from 'queue-cb';
import concatWritable from './concatWritable';
import nextColor from './nextColor';
import prefixTransform from './prefixTransform';

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

  const queue = new Queue();
  if (cp.stdout) {
    if (stdio === 'inherit') pipeline(cp.stdout, process.stdout, options, color);
    else {
      outputs.stdout = concatWritable((output) => {
        outputs.stdout.output = output.toString(encoding || 'utf8');
      });
      queue.defer(eos.bind(null, pipeline(cp.stdout, outputs.stdout, options, color)));
    }
  }
  if (cp.stderr) {
    if (stdio === 'inherit') pipeline(cp.stderr, process.stderr, options, color);
    else {
      outputs.stderr = concatWritable((output) => {
        outputs.stderr.output = output.toString(encoding || 'utf8');
      });
      queue.defer(eos.bind(null, pipeline(cp.stderr, outputs.stderr, options, color)));
    }
  }
  queue.defer(spawn.worker.bind(null, cp, { ...csOptions, encoding: 'utf8' }));
  queue.await((err) => {
    const res = (err ? err : {}) as SpawnResult;
    res.stdout = outputs.stdout ? outputs.stdout.output : null;
    res.stderr = outputs.stderr ? outputs.stderr.output : null;
    res.output = [res.stdout, res.stderr, null];
    err ? callback(err) : callback(null, res);
  });
}
