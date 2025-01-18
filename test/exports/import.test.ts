import assert from 'assert';

// @ts-ignore
import spawnStreaming from 'spawn-streaming';

describe('exports .ts', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
  });
});
