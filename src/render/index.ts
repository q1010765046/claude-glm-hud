/**
 * 渲染协调器（单行紧凑版）
 * 🔋5h:95%(23m) │ 📅Wk:68%(2d0h) │ 🌐MCP:42% │ 📊CTX:31%
 */

import { RenderContext, StdinData } from '../types.js';
import { formatResetTime, formatWeeklyResetTime } from './utils.js';
import { readContextCache, writeContextCache } from '../cache.js';
import { COLOR_SET } from '../constants.js';

/**
 * 渲染输出（单行紧凑版）
 */
export function render(ctx: RenderContext): void {
  const { stdin, usageData } = ctx;
  const isMiniMax = usageData?.provider === 'minimax';
  const parts: string[] = [];

  // 1. 🔋 5h Token 剩余 + 刷新时间
  const tokenPct5h = 100 - (usageData?.tokenPercent ?? 0);
  let fiveHourText = `🔋5h:${tokenPct5h}%`;
  if (usageData?.resetTime) {
    const info = formatResetTime(usageData.resetTime);
    if (info) fiveHourText += `(${info.text})`;
  }
  parts.push(fiveHourText);

  // 2. 📅 周 Token 剩余 + 刷新时间
  const weeklyPct = 100 - (usageData?.weeklyTokenPercent ?? 0);
  let weeklyText = `📅Wk:${weeklyPct}%`;
  if (usageData?.weeklyResetTime) {
    const info = formatWeeklyResetTime(usageData.weeklyResetTime);
    if (info) weeklyText += `(${info.text})`;
  }
  parts.push(weeklyText);

  // 3. 🌐 MCP / 语音
  const mcpPct = 100 - (usageData?.mcpPercent ?? 0);
  const mcpLabel = isMiniMax ? '语音' : 'MCP';
  parts.push(`🌐${mcpLabel}:${mcpPct}%`);

  // 4. 📊 CTX / 图像
  if (isMiniMax && usageData?.contextPercent !== undefined) {
    parts.push(`📊图像:${100 - usageData.contextPercent}%`);
  } else {
    const ctxPct = 100 - calcContextPercent(stdin);
    parts.push(`📊CTX:${ctxPct}%`);
  }

  console.log(`${COLOR_SET}${parts.join(' │ ')}`);
}

/**
 * 计算上下文窗口使用百分比（带缓存兜底）
 */
function calcContextPercent(stdin: StdinData): number {
  const cw = stdin.context_window;
  if (!cw) return 0;

  const usage = cw.current_usage;

  if (process.env.DEBUG === '1') {
    console.error('[GLM-HUD Debug] context_window:', JSON.stringify(cw, null, 2));
  }

  const inputTokens = usage?.input_tokens ?? 0;
  const cacheCreationTokens = usage?.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage?.cache_read_input_tokens ?? 0;
  const totalUsed = inputTokens + cacheCreationTokens + cacheReadTokens;

  const percent = cw.used_percentage ?? (
    cw.context_window_size && totalUsed > 0
      ? Math.round((totalUsed / cw.context_window_size) * 100)
      : null
  );

  const total = cw.context_window_size ?? 200000;

  let displayPercent = percent;

  // 当前数据为 0 时尝试使用缓存
  if ((totalUsed === 0 || percent === 0 || percent === null) && stdin.model?.display_name) {
    const cached = readContextCache();
    if (cached) {
      displayPercent = Math.round((cached.totalUsed / cached.contextWindowSize) * 100);
      if (process.env.DEBUG === '1') {
        console.error('[GLM-HUD Debug] 使用缓存数据:', { cached, current: { totalUsed, percent } });
      }
    } else if (process.env.DEBUG === '1') {
      console.error('[GLM-HUD Debug] 无缓存可用，当前数据:', { totalUsed, percent });
    }
  }

  // 有效数据时更新缓存
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

  return displayPercent ?? 0;
}
