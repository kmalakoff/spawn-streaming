import assert from 'assert';
import path from 'path';
import spawnStreaming from 'spawn-streaming';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

describe('stdio=inherit with sustained output', () => {
  const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sustained-output.js');

  it('should complete without hanging on long-running processes', function (done) {
    this.timeout(10000); // 10 second timeout (should complete in ~2-3 seconds)

    const startTime = Date.now();
    let callbackCalled = false;

    spawnStreaming('node', [FIXTURE], { stdio: 'inherit' }, { prefix: 'test' }, (err, res) => {
      callbackCalled = true;
      const duration = Date.now() - startTime;

      if (err) {
        done(new Error(`Process failed: ${err.message}`));
        return;
      }

      // Should complete in reasonable time
      assert.ok(duration < 5000, `Process took too long (${duration}ms)`);
      assert.ok(res, 'Should return result object');

      done();
    });

    // Fail fast if callback never called
    setTimeout(() => {
      if (!callbackCalled) {
        done(new Error('Test hung - callback never called (dual consumption bug)'));
      }
    }, 8000);
  });

  it('should not add data listeners when stdio=inherit', function (done) {
    this.timeout(5000);

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
