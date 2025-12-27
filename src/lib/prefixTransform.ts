import c from 'colors';
import { ImmediateStrategy, TerminalTransform } from 'terminal-model';
import type { ColorFunction } from '../types.ts';

/**
 * Creates a transform stream that adds a colored prefix to each line
 * Uses the new TerminalTransform with immediate emission strategy
 */
export default function prefixTransform(prefix: string, color: ColorFunction): NodeJS.ReadableStream {
  const createLine = (line: string) => `${c.bold(color(prefix))}: ${line}\n`;

  const transform = new TerminalTransform({
    strategy: new ImmediateStrategy(),
  });

  // Use onLine callback to format and push lines
  transform.onLine((line) => {
    transform.push(createLine(line));
  });

  return transform;
}
