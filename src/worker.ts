import spawn, { crossSpawn, type SpawnResult } from 'cross-spawn-cb';
import Queue from 'queue-cb';

import Transform from './Transform';
import nextColor from './nextColor';

import type { SpawnOptions, StreamingOptions } from './types';

export default function spawnStreaming(command: string, args: string[], spawnOptions_: SpawnOptions, options: StreamingOptions, callback) {
  const spawnOptions = { ...spawnOptions_ };
  spawnOptions.encoding = 'utf8';
  if (spawnOptions.stdio === 'inherit') delete spawnOptions.stdio;
  const cp = crossSpawn(command, args, spawnOptions);

  const color = nextColor();
  const outputs = { stdout: null, stderr: null };
  if (cp.stdout) outputs.stdout = new Transform(cp.stdout, process.stdout, spawnOptions_, options, color);
  if (cp.stderr) outputs.stderr = new Transform(cp.stderr, process.stderr, spawnOptions_, options, color);

  const queue = new Queue();
  !outputs.stdout || queue.defer(outputs.stdout.collect.bind(outputs.stdout));
  !outputs.stderr || queue.defer(outputs.stderr.collect.bind(outputs.stderr));
  queue.defer(spawn.worker.bind(null, cp, spawnOptions));
  queue.await((err) => {
    outputs.stdout.drain();
    outputs.stderr.drain();

    const res = (err ? err : {}) as SpawnResult;
    res.stdout = outputs.stdout.output();
    res.stderr = outputs.stderr.output();
    res.output = [res.stdout, res.stderr, null];
    err ? callback(err) : callback(null, res);
  });
}
