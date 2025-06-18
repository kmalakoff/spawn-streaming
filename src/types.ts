export type { SpawnCallback, SpawnOptions, SpawnResult } from 'cross-spawn-cb';

export interface StreamingOptions {
  prefix?: string;
}

export type ColorFunction = (s: string) => string;
