/**
 * ANSI 颜色工具
 */

import { ANSI, CONTEXT_THRESHOLDS } from '../constants.js';

/**
 * 根据百分比获取颜色代码
 */
export function getColor(percent: number): string {
  if (percent >= CONTEXT_THRESHOLDS.HIGH) {
    return ANSI.RED;
  }
  if (percent >= CONTEXT_THRESHOLDS.MEDIUM) {
    return ANSI.YELLOW;
  }
  return ANSI.GREEN;
}

/**
 * 渲染带颜色的进度条
 */
export function renderProgressBar(
  percent: number,
  width: number = 10
): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const color = getColor(percent);

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${color}[${bar}]${ANSI.RESET}`;
}

/**
 * 渲染带颜色的文本
 */
export function renderColorText(
  text: string,
  percent: number
): string {
  const color = getColor(percent);
  return `${color}${text}${ANSI.RESET}`;
}

/**
 * 渲染带样式的文本（自定义颜色）
 */
export function renderStyledText(
  text: string,
  colorName: 'green' | 'yellow' | 'red' | 'cyan' | 'blue' | 'magenta'
): string {
  const colorMap = {
    green: ANSI.GREEN,
    yellow: ANSI.YELLOW,
    red: ANSI.RED,
    cyan: ANSI.CYAN,
    blue: ANSI.BLUE,
    magenta: ANSI.MAGENTA,
  };
  return `${colorMap[colorName]}${text}${ANSI.RESET}`;
}
