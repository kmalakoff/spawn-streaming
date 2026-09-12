import assert from 'assert';
import isVersion from 'is-version';
import Pinkie from 'pinkie-promise';
import type { SpawnResult } from 'spawn-streaming';
import spawnStreaming from 'spawn-streaming';
import getLines from '../lib/getLines.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE ?? '');
const NODE = isWindows ? 'node.exe' : 'node';
const PLAIN_JS_ENV = { ...process.env };
delete PLAIN_JS_ENV.NODE_OPTIONS;

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
      if (err) return done(err);
      if (!res) return done(new Error('No result'));
      assert.equal(res.stdout, null);
      assert.equal(res.stderr, null);
      done();
    });
  });

  it('encoding utf8', (done) => {
    spawnStreaming(NODE, ['--version'], { encoding: 'utf8' }, (err, res) => {
      if (err) return done(err);
      if (!res) return done(new Error('No result'));
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });

  it('encoding utf8', (done) => {
    spawnStreaming(NODE, ['--version'], { encoding: 'utf8' }, { prefix: 'boom' }, (err, res) => {
      if (err) return done(err);
      if (!res) return done(new Error('No result'));
      assert.ok(res.stdout.indexOf('boom') >= 0);
      assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
      assert.equal(res.stderr, '');
      done();
    });
  });

  it('resolves a Promise after a child process succeeds', () =>
    (spawnStreaming(NODE, ['-e', "process.stdout.write('promise')"], { encoding: 'utf8', env: PLAIN_JS_ENV }) as Promise<SpawnResult>).then((res) => {
      assert.equal(res.stdout, 'promise');
      assert.equal(res.stderr, '');
    }));

  it('rejects a Promise after a child process fails', () =>
    (spawnStreaming(NODE, ['-e', 'process.exit(1)'], { encoding: 'utf8', env: PLAIN_JS_ENV }) as Promise<SpawnResult>).then(
      () => assert.fail('Expected the Promise to reject'),
      (err: Error) => assert.ok(/Non-zero exit code: 1/.test(err.message))
    ));

  it('throws when stdio inherit and encoding are both specified', () => {
    assert.throws(() => {
      spawnStreaming(NODE, ['--version'], { stdio: 'inherit', encoding: 'utf8' }, () => {});
    }, /mutually exclusive/);
  });
});
