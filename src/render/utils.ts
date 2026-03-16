/**
 * 渲染工具函数
 */

import { TOKEN_FORMAT } from '../constants.js';

/**
 * 格式化 Token 数量
 * @example
 * formatTokens(1500) // "1K"
 * formatTokens(1500000) // "1.5M"
 */
export function formatTokens(tokens: number): string {
  if (tokens >= TOKEN_FORMAT.MILLION) {
    return `${(tokens / TOKEN_FORMAT.MILLION).toFixed(1)}M`;
  }
  if (tokens >= TOKEN_FORMAT.THOUSAND) {
    return `${(tokens / TOKEN_FORMAT.THOUSAND).toFixed(0)}K`;
  }
  return `${tokens}`;
}

/**
 * 格式化时间
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}小时`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}分`);
  }

  return parts.join('') || '0分';
}

/**
 * 计算上下文使用百分比
 */
export function calculateContextPercent(
  used: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * 截断字符串到指定长度
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * 计算字符串显示宽度（中文算 2，ASCII 算 1）
 */
export function displayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += char.charCodeAt(0) > 127 ? 2 : 1;
  }
  return width;
}
