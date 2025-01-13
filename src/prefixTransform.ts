import c from 'colors';
import { Transform } from 'readable-stream';
import type { ColorFunction } from './types';

const regEx = /\r\n|[\n\v\f\r\x85\u2028\u2029]/g;

export default function prefixTransform(prefix: string, color: ColorFunction) {
  let last = '';

  const createLine = (line) => `${c.bold(color(prefix))}: ${line}\n`;

  return new Transform({
    transform(chunk, _enc, callback) {
      const more = last + chunk.toString('utf8');
      const lines = more.split(regEx);
      last = lines.pop();
      lines.forEach((line) => this.push(createLine(line)));
      callback();
    },
    flush() {
      if (last.length) this.queue(createLine(last));
      last = '';
      this.push(null);
    },
  });
}
