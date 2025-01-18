import c from 'colors';

const colors = ['cyan', 'magenta', 'blue', 'yellow', 'green', 'red', 'brightCyan', 'brightMagenta', 'brightBlue', 'brightYellow', 'brightGreen', 'brightRed'];
let colorIndex = 0;

import type { ColorFunction } from '../types';

export default function nextColor(): ColorFunction {
  const colorName = colors[colorIndex % colors.length];
  colorIndex++;
  return c[colorName];
}
