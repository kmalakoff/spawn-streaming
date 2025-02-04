import worker from './worker';

import type { SpawnCallback, SpawnOptions, StreamingOptions } from './types';

export * from './types';
export default function spawnStreaming(command: string, args: string[], spawnOptions: SpawnOptions, options?: StreamingOptions | SpawnCallback, callback?: SpawnCallback) {
  if (typeof options === 'function') {
    callback = options as SpawnCallback;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(command, args, spawnOptions, options, callback);
  return new Promise((resolve, reject) => worker(command, args, spawnOptions, options, (err, result) => (err ? reject(err) : resolve(result))));
}
