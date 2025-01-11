import assert from 'assert';
import cr from 'cr';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';

// @ts-ignore
import spawnStreaming from 'spawn-streaming';

describe('index', () => {
  (() => {
    // patch and restore promise
    // @ts-ignore
    let rootPromise: Promise;
    before(() => {
      rootPromise = global.Promise;
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = rootPromise;
    });
  })();

  it('inherit', (done) => {
    spawnStreaming('node', ['--version'], { stdio: 'inherit' }, (err, res) => {
      if (err) return done(err);
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      done();
    });
  });

  it('encoding utf8', (done) => {
    spawnStreaming('node', ['--version'], { encoding: 'utf8' }, (err, res) => {
      if (err) return done(err);
      assert.ok(isVersion(cr(res.stdout).split('\n').slice(-2, -1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });

  it('encoding utf8', (done) => {
    spawnStreaming('node', ['--version'], { encoding: 'utf8' }, { prefix: 'boom' }, (err, res) => {
      if (err) return done(err);
      const prefix = cr(res.stdout).split(':')[0];
      assert.ok(prefix.indexOf('boom') >= 0);
      assert.ok(isVersion(cr(res.stdout).split(':')[1].split('\n').slice(-2, -1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });
});
