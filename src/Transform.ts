import c from 'colors';
import eos from 'end-of-stream';
import throttle from 'lodash.throttle';

import type { ColorFunction, SpawnOptions, StreamingOptions } from './types';

export default class Transform {
  input: NodeJS.ReadStream;
  spawnOptions: SpawnOptions;
  options: StreamingOptions;
  color: ColorFunction;
  private _chunks: Buffer[];
  private _last: string;
  private _output: NodeJS.WriteStream | string;

  constructor(input: NodeJS.ReadStream, output: NodeJS.WriteStream, spawnOptions: SpawnOptions, options: StreamingOptions, color: ColorFunction) {
    this.input = input;
    this.spawnOptions = spawnOptions;
    this.options = options;
    this.color = color;
    this._chunks = [];
    this._last = '';
    this._output = spawnOptions.stdio === 'inherit' ? output : '';
  }

  collect(callback) {
    const write = this.options.throttle ? throttle(this._write.bind(this), this.options.throttle) : this._write.bind(this);

    this.input.on('data', (chunk) => {
      this._chunks.push(chunk);
      write();
    });
    eos(this.input, callback);
  }

  drain() {
    this._write();
    if (this._last.length === 0) return;
    this._writeLine(this._last);
    this._last = '';
  }

  output(): string | Buffer {
    this.drain();
    if (this.spawnOptions.encoding === 'utf8') return this._output as string;
    if (this.spawnOptions.encoding === 'binary') return Buffer.from(this._output as string);
    return null;
  }

  private _write() {
    if (this._chunks.length === 0) return;
    const more = this._last + Buffer.concat(this._chunks.splice(0)).toString('utf8');
    const lines = more.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);
    this._last = lines.pop();
    lines.forEach((line) => this._writeLine(line));
  }

  private _writeLine(line: string) {
    const outputString = this.options.prefix ? `${c.bold(this.color(this.options.prefix))}:${line}\n` : `${line}\n`;
    if (this.spawnOptions.encoding !== undefined) this._output += outputString;
    else if (this.spawnOptions.stdio === 'inherit') (this._output as NodeJS.WriteStream).write(outputString);
  }
}
