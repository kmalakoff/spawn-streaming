import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import spawnStreaming from 'spawn-streaming';
import getLines from '../lib/getLines.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

describe('index', () => {
  (() => {
    // patch and restore promise
    if (typeof global === 'undefined') return;
    const globalPromise = global.Promise;
    before(() => {
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = globalPromise;
    });
  })();

  it('inherit', (done) => {
    spawnStreaming(NODE, ['--version'], { stdio: 'inherit' }, (err, res) => {
      if (err) {
        done(err);
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
        done(err);
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
        done(err);
        return;
      }
      assert.ok(res.stdout.indexOf('boom') >= 0);
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });

  it('throws when stdio inherit and encoding are both specified', () => {
    assert.throws(() => {
      spawnStreaming(NODE, ['--version'], { stdio: 'inherit', encoding: 'utf8' }, () => {});
    }, /mutually exclusive/);
  });
});
