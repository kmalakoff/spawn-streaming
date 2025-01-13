export type { SpawnOptions, SpawnCallback, SpawnResult } from 'cross-spawn-cb';

export interface StreamingOptions {
  prefix?: string;
}

export type ColorFunction = (s: string) => string;
