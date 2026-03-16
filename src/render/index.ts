/**
 * 渲染协调器（保持老版本显示格式 + 上下文）
 */

import { RenderContext } from '../types.js';
import { formatProgressBar } from './utils.js';
import { formatResetTime } from './utils.js';
import { readContextCache, writeContextCache } from '../cache.js';

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

  // 计算总 Token 使用量（包含所有类型）
  const usage = cw.current_usage;

  // 调试：输出原始数据（仅在 DEBUG 模式下）
  if (process.env.DEBUG === '1') {
    console.error('[GLM-HUD Debug] context_window:', JSON.stringify(cw, null, 2));
  }

  const inputTokens = usage?.input_tokens ?? 0;
  const cacheCreationTokens = usage?.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage?.cache_read_input_tokens ?? 0;
  const totalUsed = inputTokens + cacheCreationTokens + cacheReadTokens;

  // 优先使用 Claude Code 提供的百分比，否则自行计算
  const percent = cw.used_percentage ?? (
    cw.context_window_size && totalUsed > 0
      ? Math.round((totalUsed / cw.context_window_size) * 100)
      : null
  );

  const total = cw.context_window_size ?? 200000;

  // 检测是否需要使用缓存（思考过程中数据可能为 0）
  let displayUsed = totalUsed;
  let displayPercent = percent;

  // 如果当前数据为 0 或空，尝试使用缓存
  if ((totalUsed === 0 || percent === 0 || percent === null) && stdin.model?.display_name) {
    const cached = readContextCache();
    if (cached) {
      // 使用缓存的数据
      displayUsed = cached.totalUsed;
      displayPercent = Math.round((cached.totalUsed / cached.contextWindowSize) * 100);

      // 调试输出
      if (process.env.DEBUG === '1') {
        console.error('[GLM-HUD Debug] 使用缓存数据:', {
          cached,
          current: { totalUsed, percent }
        });
      }
    } else if (process.env.DEBUG === '1') {
      console.error('[GLM-HUD Debug] 无缓存可用，当前数据:', { totalUsed, percent });
    }
  }

  // 只在有有效数据时更新缓存
  if (totalUsed > 0 && percent !== null && percent > 0) {
    writeContextCache({
      inputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      totalUsed,
      contextWindowSize: total,
      timestamp: Date.now(),
    });
  }

  if (displayPercent === null || displayPercent === 0) return null;

  const usedStr = formatTokens(displayUsed);
  const totalStr = formatTokens(total);

  return `📊上下文:${formatProgressBar(displayPercent)} ${displayPercent}% (${usedStr}/${totalStr})`;
}

// 重新导出 formatTokens 供其他模块使用
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return `${tokens}`;
}
