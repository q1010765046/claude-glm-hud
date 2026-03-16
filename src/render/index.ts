/**
 * 渲染协调器（保持老版本显示格式 + 上下文）
 */

import { RenderContext } from '../types.js';
import { formatProgressBar } from './utils.js';
import { formatResetTime } from './utils.js';

/**
 * 渲染输出（老版本格式 + 上下文）
 */
export function render(ctx: RenderContext): void {
  const { stdin, glmUsage } = ctx;

  const parts: string[] = [];

  // 1. Token 进度条（老版本）
  if (glmUsage && glmUsage.tokenPercent !== null) {
    const tokenStr = `🔋Token:${formatProgressBar(glmUsage.tokenPercent)} ${glmUsage.tokenPercent.toString().padStart(3)}%`;
    parts.push(tokenStr);
  }

  // 2. 剩余时间进度条（老版本）
  if (glmUsage && glmUsage.resetTime) {
    const resetInfo = formatResetTime(glmUsage.resetTime);
    if (resetInfo) {
      const resetStr = `🔄剩余:${formatProgressBar(resetInfo.percent)} ${resetInfo.text}`;
      parts.push(resetStr);
    }
  }

  // 3. MCP 进度条（老版本）
  if (glmUsage && glmUsage.mcpPercent !== undefined) {
    const mcpStr = `🌐MCP:${formatProgressBar(glmUsage.mcpPercent)} ${glmUsage.mcpPercent.toString().padStart(3)}%`;
    parts.push(mcpStr);
  }

  // 4. 上下文窗口（新增，放在最后）
  const contextInfo = renderContextInfo(stdin);
  if (contextInfo) {
    parts.push(contextInfo);
  }

  // 组合内容（老版本格式：用 │ 分隔）
  if (parts.length > 0) {
    const content = parts.join(' │ ');
    console.log(content);
  }
}

/**
 * 渲染上下文信息（新增功能）
 */
function renderContextInfo(stdin: any): string | null {
  const cw = stdin.context_window;
  if (!cw) return null;

  const percent = cw.used_percentage ?? (
    cw.context_window_size && cw.current_usage?.input_tokens
      ? Math.round((cw.current_usage.input_tokens / cw.context_window_size) * 100)
      : null
  );

  if (percent === null) return null;

  const used = cw.current_usage?.input_tokens ?? 0;
  const total = cw.context_window_size ?? 200000;
  const usedStr = formatTokens(used);
  const totalStr = formatTokens(total);

  return `📊上下文:${formatProgressBar(percent)} ${percent}% (${usedStr}/${totalStr})`;
}

// 重新导出 formatTokens 供其他模块使用
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return `${tokens}`;
}
