import assert from 'assert';
import LineBuffer from '../../src/lib/LineBuffer.ts';

describe('LineBuffer', () => {
  describe('basic line handling', () => {
    it('should emit lines on newline', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('hello\nworld\n');
      buffer.dispose();

      assert.deepEqual(lines, ['hello', 'world']);
    });

    it('should buffer partial lines until newline', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('hel');
      assert.deepEqual(lines, []);

      buffer.write('lo\n');
      assert.deepEqual(lines, ['hello']);

      buffer.dispose();
    });

    it('should emit partial line on flush', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('incomplete');
      assert.deepEqual(lines, []);

      buffer.flush();
      assert.deepEqual(lines, ['incomplete']);

      buffer.dispose();
    });

    it('should handle empty lines', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('first\n\nsecond\n');
      buffer.dispose();

      assert.deepEqual(lines, ['first', '', 'second']);
    });
  });

  describe('carriage return (progress bars)', () => {
    it('should handle carriage return as overwrite', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('Progress: 10%\rProgress: 50%\rProgress: 100%\n');
      buffer.dispose();

      assert.deepEqual(lines, ['Progress: 100%']);
    });

    it('should handle partial overwrites', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('AAAAAAAA\rBBB\n');
      buffer.dispose();

      assert.deepEqual(lines, ['BBBAAAAA']);
    });

    it('should handle multiple chunks with carriage return', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('Loading...');
      buffer.write('\rDone!     \n');
      buffer.dispose();

      assert.deepEqual(lines, ['Done!']);
    });
  });

  describe('SGR (color) sequences', () => {
    it('should preserve color codes', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('\x1b[31mred\x1b[0m\n');
      buffer.dispose();

      assert.deepEqual(lines, ['\x1b[31mred\x1b[0m']);
    });

    it('should preserve colors with carriage return overwrite', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('\x1b[31mAAAA\x1b[0m\r\x1b[32mBB\x1b[0m\n');
      buffer.dispose();

      // Result: green BB followed by red AA (no redundant reset between)
      assert.deepEqual(lines, ['\x1b[32mBB\x1b[31mAA\x1b[0m']);
    });

    it('should carry colors across line boundaries', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('\x1b[31mred line\nstill red\x1b[0m\n');
      buffer.dispose();

      assert.deepEqual(lines, ['\x1b[31mred line\x1b[0m', '\x1b[31mstill red\x1b[0m']);
    });

    it('should reset color at end of line if active', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('\x1b[34mblue\n');
      buffer.dispose();

      assert.deepEqual(lines, ['\x1b[34mblue\x1b[0m']);
    });
  });

  describe('cursor movement sequences', () => {
    it('should handle cursor to column (CSI G)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('ABCDEFGH\x1b[4GXX\n');
      buffer.dispose();

      assert.deepEqual(lines, ['ABCXXFGH']);
    });

    it('should handle cursor forward (CSI C)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('AB\x1b[3CXX\n');
      buffer.dispose();

      // AB + 3 spaces + XX
      assert.deepEqual(lines, ['AB   XX']);
    });

    it('should handle cursor back (CSI D)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('ABCDE\x1b[2DXX\n');
      buffer.dispose();

      assert.deepEqual(lines, ['ABCXX']);
    });
  });

  describe('erase sequences', () => {
    it('should handle erase to end of line (CSI 0K)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('ABCDEFGH\x1b[4G\x1b[K\n');
      buffer.dispose();

      assert.deepEqual(lines, ['ABC']);
    });

    it('should handle erase entire line (CSI 2K)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('ABCDEFGH\x1b[2Knew content\n');
      buffer.dispose();

      assert.deepEqual(lines, ['new content']);
    });

    it('should handle erase character (CSI X)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('ABCDEFGH\x1b[4G\x1b[2X\n');
      buffer.dispose();

      // ABC + 2 erased + FGH
      assert.deepEqual(lines, ['ABC  FGH']);
    });
  });

  describe('multi-line sequences (should be ignored)', () => {
    it('should ignore cursor up (CSI A)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('line1\nline2\x1b[1Aignored\n');
      buffer.dispose();

      // The cursor up is ignored, text continues on line2
      assert.deepEqual(lines, ['line1', 'line2ignored']);
    });

    it('should ignore clear screen (CSI J)', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('before\x1b[2Jafter\n');
      buffer.dispose();

      assert.deepEqual(lines, ['beforeafter']);
    });
  });

  describe('special characters', () => {
    it('should handle backspace', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      // Backspace moves cursor back, next char overwrites at that position
      // Type 'ABC', backspace to position 2, type 'X' overwrites 'C'
      buffer.write('ABC\x08X\n');
      buffer.dispose();

      assert.deepEqual(lines, ['ABX']);
    });

    it('should handle tabs', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('a\tb\n');
      buffer.dispose();

      // Tab moves to next 8-column boundary
      assert.deepEqual(lines, ['a       b']);
    });

    it('should handle CRLF', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('line1\r\nline2\r\n');
      buffer.dispose();

      assert.deepEqual(lines, ['line1', 'line2']);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle npm-style progress', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      // Simulate npm progress spinner
      buffer.write('⠋ Installing...\r');
      buffer.write('⠙ Installing...\r');
      buffer.write('⠹ Installing...\r');
      buffer.write('✓ Installed!   \n');
      buffer.dispose();

      assert.deepEqual(lines, ['✓ Installed!']);
    });

    it('should handle wget-style progress bar', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      buffer.write('[          ] 0%\r');
      buffer.write('[##        ] 20%\r');
      buffer.write('[####      ] 40%\r');
      buffer.write('[######    ] 60%\r');
      buffer.write('[########  ] 80%\r');
      buffer.write('[##########] 100%\n');
      buffer.dispose();

      assert.deepEqual(lines, ['[##########] 100%']);
    });

    it('should handle colored output with progress', () => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line));

      // Green checkmark, then status
      buffer.write('\x1b[32m✓\x1b[0m Building... \r');
      buffer.write('\x1b[32m✓\x1b[0m Build complete!\n');
      buffer.dispose();

      assert.deepEqual(lines, ['\x1b[32m✓\x1b[0m Build complete!']);
    });
  });

  describe('flush timeout', () => {
    it('should flush after timeout when configured', (done) => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line), 50);

      buffer.write('partial');
      assert.deepEqual(lines, []);

      setTimeout(() => {
        assert.deepEqual(lines, ['partial']);
        buffer.dispose();
        done();
      }, 100);
    });

    it('should not auto-flush when timeout is Infinity', (done) => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line), Infinity);

      buffer.write('partial');

      setTimeout(() => {
        assert.deepEqual(lines, []);
        buffer.flush();
        assert.deepEqual(lines, ['partial']);
        buffer.dispose();
        done();
      }, 50);
    });

    it('should cancel timeout on newline', (done) => {
      const lines: string[] = [];
      const buffer = new LineBuffer((line) => lines.push(line), 50);

      buffer.write('complete\n');
      assert.deepEqual(lines, ['complete']);

      // Wait to ensure no duplicate flush
      setTimeout(() => {
        assert.deepEqual(lines, ['complete']);
        buffer.dispose();
        done();
      }, 100);
    });
  });
});
