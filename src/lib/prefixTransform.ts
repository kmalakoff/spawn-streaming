import Stream from 'stream';

const major = +process.versions.node.split('.')[0];
let Transform: typeof Stream.Transform;
if (major > 0) {
  Transform = Stream.Transform;
} else {
  Transform = require('readable-stream').Transform;
}

import c from 'colors';
import type { ColorFunction } from '../types.ts';
import LineBuffer from './LineBuffer.ts';

export default function prefixTransform(prefix: string, color: ColorFunction): NodeJS.ReadableStream {
  const createLine = (line: string) => `${c.bold(color(prefix))}: ${line}\n`;

  let transform: InstanceType<typeof Transform>;
  const lineBuffer = new LineBuffer((line) => {
    transform.push(createLine(line));
  });

  transform = new Transform({
    transform(chunk, _enc, callback) {
      lineBuffer.write(chunk);
      callback();
    },
    flush() {
      lineBuffer.flush();
      lineBuffer.dispose();
      this.push(null);
    },
  });

  return transform;
}
