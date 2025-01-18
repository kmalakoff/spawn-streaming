const assert = require('assert');
const spawnStreaming = require('spawn-streaming');

describe('exports .cjs', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
  });
});
