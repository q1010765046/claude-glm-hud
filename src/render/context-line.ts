/**
 * 上下文行渲染
 * 核心功能：显示上下文窗口使用情况
 */

import { RenderContext } from '../types.js';
import {
  getContextUsagePercent,
  getContextWindowSize,
  getContextUsedTokens,
} from '../stdin.js';
import { renderProgressBar, renderColorText } from './colors.js';
import { formatTokens, calculateContextPercent } from './utils.js';

/**
 * 渲染上下文行
 * @example
 * 📊上下文:[██████░░░░] 45% (90K/200K)
 */
export function renderContextLine(ctx: RenderContext): string | null {
  const { stdin, config } = ctx;

  // 检查是否显示上下文
  if (!config.display.showContext) {
    return null;
  }

  // 获取上下文数据
  const percent = getContextUsagePercent(stdin);
  if (percent === null) {
    return null;
  }

  const used = getContextUsedTokens(stdin);
  const total = getContextWindowSize(stdin);

  // 构建输出
  const parts: string[] = [];

  // 图标和标签
  parts.push('📊上下文:');

  // 进度条
  if (config.display.showContextBar) {
    parts.push(renderProgressBar(percent, 10));
  }

  // 百分比
  parts.push(`${renderColorText(`${percent}%`, percent)}`);

  // Token 数量
  if (config.display.showTokenBreakdown) {
    const usedStr = formatTokens(used);
    const totalStr = formatTokens(total);
    parts.push(`(${usedStr}/${totalStr})`);
  }

  return parts.join(' ');
}

/**
 * 渲染简化版上下文行（用于 compact 模式）
 */
export function renderContextLineCompact(ctx: RenderContext): string | null {
  const { stdin, config } = ctx;

  if (!config.display.showContext) {
    return null;
  }

  const percent = getContextUsagePercent(stdin);
  if (percent === null) {
    return null;
  }

  const bar = config.display.showContextBar
    ? renderProgressBar(percent, 8)
    : '';

  return `📊${bar}${renderColorText(`${percent}%`, percent)}`;
}
