export type { SpawnOptions, SpawnCallback } from 'cross-spawn-cb';

export interface StreamingOptions {
  prefix?: string;
  throttle?: number;
}

export type ColorFunction = (s: string) => string;
