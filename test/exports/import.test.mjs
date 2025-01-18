import assert from 'assert';
import spawnStreaming from 'spawn-streaming';

describe('exports .mjs', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
  });
});
