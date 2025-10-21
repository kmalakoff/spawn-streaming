import assert from 'assert';

import spawnStreaming from 'spawn-streaming';

describe('exports .ts', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
  });
});
