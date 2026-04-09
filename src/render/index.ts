/**
 * 渲染协调器（保持老版本显示格式 + 上下文）
 */

import { RenderContext } from '../types.js';
import { formatProgressBar, formatResetTime, formatDuration } from './utils.js';
import { readContextCache, writeContextCache } from '../cache.js';

/**
 * 渲染输出（老版本格式 + 上下文）
 */
export function render(ctx: RenderContext): void {
  const { stdin, usageData } = ctx;  // 重命名 glmUsage -> usageData

  const parts: string[] = [];
  const isMiniMax = usageData?.provider === 'minimax';

  // 1. Token 进度条（主显示5小时，括号内显示周限额）
  if (usageData && usageData.tokenPercent !== null) {
    let tokenStr = `🔋Token:${formatProgressBar(usageData.tokenPercent)} ${usageData.tokenPercent.toString().padStart(3)}%`;
    if (usageData.weeklyTokenPercent !== undefined) {
      tokenStr += ` (周${usageData.weeklyTokenPercent.toString().padStart(3)}%)`;
    }
    parts.push(tokenStr);
  }

  // 2. 剩余时间进度条（主显示5小时，括号内显示周限额刷新时间）
  if (usageData && usageData.resetTime) {
    const resetInfo = formatResetTime(usageData.resetTime);
    if (resetInfo) {
      let resetStr = `🔄剩余:${formatProgressBar(resetInfo.percent)} ${resetInfo.text}`;
      if (usageData.weeklyResetTime) {
        const weeklyDelta = Math.max(0, Math.floor((usageData.weeklyResetTime - Date.now()) / 1000));
        if (weeklyDelta > 0) {
          resetStr += ` (${formatDuration(weeklyDelta)})`;
        }
      }
      parts.push(resetStr);
    }
  }

  // 3. MCP/语音 进度条
  if (usageData && usageData.mcpPercent !== undefined) {
    const label = isMiniMax ? '语音' : 'MCP';
    const mcpStr = `🌐${label}:${formatProgressBar(usageData.mcpPercent)} ${usageData.mcpPercent.toString().padStart(3)}%`;
    parts.push(mcpStr);
  }

  // 4. 上下文/图像 进度条
  if (isMiniMax && usageData?.contextPercent !== undefined) {
    // MiniMax 模式：显示图像使用率
    const imageStr = `📊图像:${formatProgressBar(usageData.contextPercent)} ${usageData.contextPercent.toString().padStart(3)}%`;
    parts.push(imageStr);
  } else {
    // 智谱模式：显示上下文窗口
    const contextInfo = renderContextInfo(stdin);
    if (contextInfo) {
      parts.push(contextInfo);
    }
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
