import c from 'colors';
import newlineIterator from 'newline-iterator';
import { Transform } from 'readable-stream';
import type { ColorFunction } from '../types';

export default function prefixTransform(prefix: string, color: ColorFunction) {
  let last = '';

  const createLine = (line) => `${c.bold(color(prefix))}: ${line}\n`;

  return new Transform({
    transform(chunk, _enc, callback) {
      const string = last + chunk.toString('utf8');
      const lines = [];
      const iterator = newlineIterator(string);
      let next = iterator.next();
      while (!next.done) {
        lines.push(next.value);
        next = iterator.next();
      }
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
