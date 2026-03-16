/**
 * MCP 使用率行渲染
 */

import { RenderContext } from '../types.js';
import { renderProgressBar, renderColorText } from './colors.js';

/**
 * 渲染 MCP 使用率行
 * @example
 * 🌐MCP:[██████░░░░] 65%
 */
export function renderMcpLine(ctx: RenderContext): string | null {
  const { glmUsage, config } = ctx;

  // 检查是否显示
  if (!config.display.showMcp) {
    return null;
  }

  // 检查是否有数据
  if (!glmUsage || glmUsage.mcpPercent === undefined) {
    return null;
  }

  const percent = glmUsage.mcpPercent;

  // 构建输出
  const parts: string[] = [];

  // 图标和标签
  parts.push('🌐MCP:');

  // 进度条
  parts.push(renderProgressBar(percent, 10));

  // 百分比
  parts.push(renderColorText(`${percent}%`, percent));

  return parts.join(' ');
}

/**
 * 渲染简化版 MCP 使用率行
 */
export function renderMcpLineCompact(ctx: RenderContext): string | null {
  const { glmUsage, config } = ctx;

  if (!config.display.showMcp) {
    return null;
  }

  if (!glmUsage || glmUsage.mcpPercent === undefined) {
    return null;
  }

  const percent = glmUsage.mcpPercent;
  const bar = renderProgressBar(percent, 8);

  return `🌐${bar}${renderColorText(`${percent}%`, percent)}`;
}
