import type { SpawnCallback, SpawnOptions, StreamingOptions } from './types.ts';
import worker from './worker.ts';

export * from './types.ts';
export default function spawnStreaming(command: string, args: string[], spawnOptions: SpawnOptions, options?: StreamingOptions | SpawnCallback, callback?: SpawnCallback) {
  if (spawnOptions.stdio === 'inherit' && spawnOptions.encoding) {
    throw new Error("Options 'stdio: inherit' and 'encoding' are mutually exclusive. Use 'stdio: inherit' to display output, or 'encoding' to collect output.");
  }

  callback = typeof options === 'function' ? options : callback;
  options = typeof options === 'function' ? {} : ((options || {}) as StreamingOptions);

  if (typeof callback === 'function') return worker(command, args, spawnOptions, options, callback);
  return new Promise((resolve, reject) => worker(command, args, spawnOptions, options, (err, result) => (err ? reject(err) : resolve(result))));
}
