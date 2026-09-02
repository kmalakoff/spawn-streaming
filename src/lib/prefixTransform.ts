import c from 'colors';
import { Transform } from 'readable-stream';
import type { ColorFunction } from '../types.js';

const REGEX_NEW_LINE = /\r?\n|\r/g;

export default function prefixTransform(prefix: string, color: ColorFunction) {
  let last = '';

  const createLine = (line) => `${c.bold(color(prefix))}: ${line}\n`;

  return new Transform({
    transform(chunk, _enc, callback) {
      const more = last + chunk.toString('utf8');
      const lines = more.split(REGEX_NEW_LINE);
      last = lines.pop();
      lines.forEach((line) => this.push(createLine(line)));
      callback();
    },
    flush() {
      if (last.length) this.push(createLine(last));
      last = '';
      this.push(null);
    },
  });
}
