import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import getLines from '../lib/getLines.cjs';

// @ts-ignore
import spawnStreaming from 'spawn-streaming';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

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
    spawnStreaming(NODE, ['--version'], { stdio: 'inherit' }, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      done();
    });
  });

  it('encoding utf8', (done) => {
    spawnStreaming(NODE, ['--version'], { encoding: 'utf8' }, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });

  it('encoding utf8', (done) => {
    spawnStreaming(NODE, ['--version'], { encoding: 'utf8' }, { prefix: 'boom' }, (err, res) => {
      if (err) {
        done(err.message);
        return;
      }
      assert.ok(res.stdout.indexOf('boom') >= 0);
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });
});
