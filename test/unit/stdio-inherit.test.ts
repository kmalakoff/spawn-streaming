import assert from 'assert';
import path from 'path';
import spawnStreaming from 'spawn-streaming';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

describe('stdio=inherit with sustained output', () => {
  const MAX_DURATION = 10000;
  const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sustained-output.js');

  it('should complete without hanging on long-running processes', function (done) {
    this.timeout(MAX_DURATION);
    const startTime = Date.now();

    spawnStreaming('node', [FIXTURE], { stdio: 'inherit' }, { prefix: 'test' }, (err, res) => {
      const duration = Date.now() - startTime;

      if (err) {
        done(new Error(`Process failed: ${err.message}`));
        return;
      }

      // Should complete in reasonable time
      assert.ok(res, 'Should return result object');
      assert.ok(duration < MAX_DURATION, `Should complete in < ${MAX_DURATION}ms (took ${duration}ms)`);
      done();
    });
  });

  it('should not add data listeners when stdio=inherit', (done) => {
    // Shorter test to verify encoding parameter is NOT passed
    spawnStreaming('node', ['-e', 'console.log("test")'], { stdio: 'inherit' }, { prefix: 'quick' }, (err, res) => {
      if (err) return done(err);

      // When stdio=inherit, spawn.worker shouldn't buffer output
      // res.stdout and res.stderr should be null
      assert.strictEqual(res.stdout, null);
      assert.strictEqual(res.stderr, null);
      done();
    });
  });
});
