// Configurable flush timeout for partial lines (in ms)
// Infinity = only flush on newline or explicit flush()
// 0 = flush immediately (effectively disables buffering)
// N = flush partial line after N ms of no newline
const FLUSH_TIMEOUT = Infinity;

// ESC character for ANSI sequences
const ESC = '\x1b';

// CSI sequence: ESC [ params command (e.g., ESC[31m for red)
const CSI_REGEX = new RegExp(`^${ESC}\\[([0-9;]*)([A-Za-z])`);

// OSC and other escape sequences to discard (e.g., ESC]0;title BEL)
const OSC_REGEX = new RegExp(`^${ESC}[\\]P^_][^\\x07${ESC}]*(?:\\x07|${ESC}\\\\)?`);

interface Cell {
  char: string;
  sgr: string;
}

type LineCallback = (line: string) => void;

export default class LineBuffer {
  private cells: Array<Cell | null> = [];
  private cursor = 0;
  private activeSgr = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private onLine: LineCallback;
  private flushTimeout: number;

  constructor(onLine: LineCallback, flushTimeout = FLUSH_TIMEOUT) {
    this.onLine = onLine;
    this.flushTimeout = flushTimeout;
  }

  write(input: string | Buffer): void {
    const str = typeof input === 'string' ? input : input.toString('utf8');
    let i = 0;

    this.cancelFlushTimer();

    while (i < str.length) {
      const char = str[i];

      // Check for ESC sequence
      if (char === ESC) {
        const remaining = str.slice(i);

        // Check for CSI sequence (ESC [)
        if (str[i + 1] === '[') {
          const csiMatch = remaining.match(CSI_REGEX);
          if (csiMatch) {
            const [seq, params, cmd] = csiMatch;
            i += seq.length;
            this.handleCSI(params, cmd, seq);
            continue;
          }
        }

        // Check for other escape sequences (OSC, etc.) - discard them
        const otherMatch = remaining.match(OSC_REGEX);
        if (otherMatch) {
          i += otherMatch[0].length;
          continue;
        }
      }

      // Handle regular characters
      if (char === '\r') {
        // Carriage return - move cursor to start (overwrite mode)
        this.cursor = 0;
      } else if (char === '\n') {
        // Newline - emit the completed line
        this.emitLine();
      } else if (char === '\x08') {
        // Backspace
        this.cursor = Math.max(0, this.cursor - 1);
      } else if (char === '\t') {
        // Tab - move to next 8-column boundary
        const nextTab = (Math.floor(this.cursor / 8) + 1) * 8;
        while (this.cursor < nextTab) {
          this.cells[this.cursor] = { char: ' ', sgr: this.activeSgr };
          this.cursor++;
        }
      } else if (char >= ' ' || char > '\x7f') {
        // Printable character (including unicode)
        this.cells[this.cursor] = { char, sgr: this.activeSgr };
        this.cursor++;
      }
      // Other control characters (0x00-0x1F except handled above) are ignored

      i++;
    }

    // Schedule flush timer for partial line if configured
    this.scheduleFlushTimer();
  }

  private handleCSI(params: string, cmd: string, seq: string): void {
    const p = params ? params.split(';').map((n) => parseInt(n, 10) || 0) : [0];

    switch (cmd) {
      case 'm': // SGR (Select Graphic Rendition) - colors and styles
        this.activeSgr = seq;
        break;

      case 'G': // CHA - Cursor Horizontal Absolute
        this.cursor = Math.max(0, (p[0] || 1) - 1);
        break;

      case 'C': // CUF - Cursor Forward
        this.cursor += p[0] || 1;
        break;

      case 'D': // CUB - Cursor Back
        this.cursor = Math.max(0, this.cursor - (p[0] || 1));
        break;

      case 'K': // EL - Erase in Line
        {
          const mode = p[0] || 0;
          if (mode === 0) {
            // Erase from cursor to end of line
            this.cells.length = this.cursor;
          } else if (mode === 1) {
            // Erase from start to cursor
            for (let j = 0; j <= this.cursor; j++) {
              this.cells[j] = null;
            }
          } else if (mode === 2) {
            // Erase entire line
            this.cells = [];
            this.cursor = 0;
          }
        }
        break;

      case 'X': // ECH - Erase Character
        {
          const count = p[0] || 1;
          for (let j = 0; j < count; j++) {
            this.cells[this.cursor + j] = null;
          }
        }
        break;

      case 'P': // DCH - Delete Character (shift left)
        this.cells.splice(this.cursor, p[0] || 1);
        break;

      case '@': // ICH - Insert Character (shift right)
        {
          const count = p[0] || 1;
          const blanks = new Array(count).fill(null);
          this.cells.splice(this.cursor, 0, ...blanks);
        }
        break;

      // Multi-line sequences - discard (can't handle in streaming mode)
      case 'A': // CUU - Cursor Up
      case 'B': // CUD - Cursor Down
      case 'H': // CUP - Cursor Position
      case 'f': // HVP - Horizontal Vertical Position
      case 'J': // ED - Erase in Display
      case 'S': // SU - Scroll Up
      case 'T': // SD - Scroll Down
        // Ignore - incompatible with line-based streaming
        break;

      // Other sequences - ignore
      default:
        break;
    }
  }

  private emitLine(): void {
    this.cancelFlushTimer();
    const line = this.renderLine();
    this.reset();
    this.onLine(line);
  }

  private renderLine(): string {
    const SGR_RESET = `${ESC}[0m`;
    let result = '';
    let lastSgr = '';

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell?.char) {
        // Only emit SGR if it changed
        if (cell.sgr !== lastSgr) {
          result += cell.sgr;
          lastSgr = cell.sgr;
        }
        result += cell.char;
      } else {
        // Null or undefined cell - emit space (erased position)
        // Reset color first if we had one
        if (lastSgr && lastSgr !== SGR_RESET) {
          result += SGR_RESET;
          lastSgr = '';
        }
        result += ' ';
      }
    }

    // Trim trailing spaces
    result = result.replace(/ +$/, '');

    // Reset SGR at end of line if we have an active style
    if (lastSgr && lastSgr !== SGR_RESET) {
      result += SGR_RESET;
    }

    return result;
  }

  private reset(): void {
    this.cells = [];
    this.cursor = 0;
    // Note: activeSgr carries over (color continues to next line)
  }

  private scheduleFlushTimer(): void {
    if (this.flushTimeout === Infinity || this.flushTimeout <= 0) return;
    if (this.cells.length === 0) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.cells.length > 0) {
        this.emitLine();
      }
    }, this.flushTimeout);
  }

  private cancelFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush any remaining buffered content.
   * Call this when the stream ends to emit any partial line.
   */
  flush(): void {
    this.cancelFlushTimer();
    if (this.cells.length > 0) {
      const line = this.renderLine();
      this.reset();
      this.onLine(line);
    }
  }

  /**
   * Clean up resources (timers).
   */
  dispose(): void {
    this.cancelFlushTimer();
  }
}
