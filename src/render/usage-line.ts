/**
 * Token 使用率行渲染
 */

import { RenderContext } from '../types.js';
import { renderProgressBar, renderColorText } from './colors.js';

/**
 * 渲染 Token 使用率行
 * @example
 * 🔋Token:[░░░░░░░░░░] 3%
 */
export function renderUsageLine(ctx: RenderContext): string | null {
  const { glmUsage, config } = ctx;

  // 检查是否显示
  if (!config.display.showUsage) {
    return null;
  }

  // 检查是否有数据
  if (!glmUsage || glmUsage.apiUnavailable) {
    return null;
  }

  const percent = glmUsage.tokenPercent;

  // 构建输出
  const parts: string[] = [];

  // 图标和标签
  parts.push('🔋Token:');

  // 进度条
  parts.push(renderProgressBar(percent, 10));

  // 百分比
  parts.push(renderColorText(`${percent}%`, percent));

  // 剩余时间
  if (glmUsage.resetSeconds !== undefined && glmUsage.resetSeconds > 0) {
    const hours = Math.floor(glmUsage.resetSeconds / 3600);
    const minutes = Math.floor((glmUsage.resetSeconds % 3600) / 60);

    if (hours > 0 || minutes > 0) {
      const timeStr = hours > 0
        ? `${hours}小时${minutes}分`
        : `${minutes}分`;
      parts.push(`(${timeStr}后重置)`);
    }
  }

  return parts.join(' ');
}

/**
 * 渲染简化版 Token 使用率行
 */
export function renderUsageLineCompact(ctx: RenderContext): string | null {
  const { glmUsage, config } = ctx;

  if (!config.display.showUsage) {
    return null;
  }

  if (!glmUsage || glmUsage.apiUnavailable) {
    return null;
  }

  const percent = glmUsage.tokenPercent;
  const bar = renderProgressBar(percent, 8);

  return `🔋${bar}${renderColorText(`${percent}%`, percent)}`;
}
