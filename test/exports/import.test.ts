import assert from 'assert';

// @ts-ignore
import spawnStreaming from 'spawn-streaming';
// @ts-ignore
import { Transform, nextColor } from 'spawn-streaming';

describe('exports .ts', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
    assert.equal(typeof Transform, 'function');
    assert.equal(typeof nextColor, 'function');
  });
});
