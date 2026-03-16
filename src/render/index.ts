/**
 * 渲染协调器
 * 整合所有渲染模块，输出到 stdout
 */

import { RenderContext } from '../types.js';
import { getModelDisplayName } from '../stdin.js';
import { renderContextLine, renderContextLineCompact } from './context-line.js';
import { renderUsageLine, renderUsageLineCompact } from './usage-line.js';
import { renderMcpLine, renderMcpLineCompact } from './mcp-line.js';

/**
 * 渲染输出（主函数）
 */
export function render(ctx: RenderContext): void {
  const { config } = ctx;

  // 根据布局模式选择渲染方式
  if (config.lineLayout === 'expanded') {
    renderExpanded(ctx);
  } else {
    renderCompact(ctx);
  }
}

/**
 * Compact 模式（单行）
 * @example
 * 📊上下文:[██████░░░░] 45% (90K/200K) │ 🔋Token:[░░░░░░░░░░] 3% │ 🌐MCP:[██████░░░░] 65%
 */
function renderCompact(ctx: RenderContext): void {
  const lines: string[] = [];

  // 1. 上下文行
  const contextLine = renderContextLineCompact(ctx);
  if (contextLine) {
    lines.push(contextLine);
  }

  // 2. Token 使用率行
  const usageLine = renderUsageLineCompact(ctx);
  if (usageLine) {
    lines.push(usageLine);
  }

  // 3. MCP 使用率行
  const mcpLine = renderMcpLineCompact(ctx);
  if (mcpLine) {
    lines.push(mcpLine);
  }

  // 输出
  if (lines.length > 0) {
    const separator = ctx.config.showSeparators ? ' │ ' : ' ';
    console.log(lines.join(separator));
  }
}

/**
 * Expanded 模式（多行）
 * @example
 * 📊上下文:[██████░░░░] 45% (90K/200K)
 * 🔋Token:[░░░░░░░░░░] 3%
 * 🌐MCP:[██████░░░░] 65%
 */
function renderExpanded(ctx: RenderContext): void {
  const lines: string[] = [];

  // 1. 上下文行
  const contextLine = renderContextLine(ctx);
  if (contextLine) {
    lines.push(contextLine);
  }

  // 2. Token 使用率行
  const usageLine = renderUsageLine(ctx);
  if (usageLine) {
    lines.push(usageLine);
  }

  // 3. MCP 使用率行
  const mcpLine = renderMcpLine(ctx);
  if (mcpLine) {
    lines.push(mcpLine);
  }

  // 输出（每行一个）
  for (const line of lines) {
    console.log(line);
  }
}

/**
 * 渲染模型信息（可选）
 */
export function renderModelInfo(ctx: RenderContext): string | null {
  if (!ctx.config.display.showModel) {
    return null;
  }

  const modelName = getModelDisplayName(ctx.stdin);
  return modelName;
}
