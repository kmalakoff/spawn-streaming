const assert = require('assert');
const spawnStreaming = require('spawn-streaming');
const { Transform, nextColor } = require('spawn-streaming');

describe('exports .cjs', () => {
  it('defaults', () => {
    assert.equal(typeof spawnStreaming, 'function');
    assert.equal(typeof Transform, 'function');
    assert.equal(typeof nextColor, 'function');
  });
});
