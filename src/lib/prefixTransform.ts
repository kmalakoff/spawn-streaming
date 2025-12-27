import c from 'colors';
import type { ColorFunction } from '../types.ts';
import { ImmediateStrategy } from './terminal/strategies/ImmediateStrategy.ts';
import TerminalTransform from './terminal/TerminalTransform.ts';

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
