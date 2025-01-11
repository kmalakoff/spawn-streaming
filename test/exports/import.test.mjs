import assert from 'assert';
import spawnStreaming from 'spawn-streaming';
import { Transform, nextColor } from 'spawn-streaming';

describe('exports .mjs', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
    assert.equal(typeof Transform, 'function');
    assert.equal(typeof nextColor, 'function');
  });
});
