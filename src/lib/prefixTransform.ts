import StreamCompat from 'readable-stream';
import Stream from 'stream';

const major = +process.versions.node.split('.')[0];
const Transform = major > 0 ? Stream.Transform : StreamCompat.Transform;

import c from 'colors';
import type { ColorFunction } from '../types.ts';

const REGEX_NEW_LINE = /\r?\n|\r/g;

export default function prefixTransform(prefix: string, color: ColorFunction): NodeJS.ReadableStream {
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
