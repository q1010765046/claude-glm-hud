/**
 * 渲染协调器（双行对齐版）
 * 第1行：5h Token │ 5h 剩余 │ MCP
 * 第2行：周 Token │ 周 剩余 │ 上下文
 */

import { RenderContext, StdinData, ContextCacheData } from '../types.js';
import { formatProgressBar, formatResetTime, formatWeeklyResetTime, formatDuration, formatTokens } from './utils.js';
import { readContextCache, writeContextCache } from '../cache.js';
import { TIME_PAD_WIDTH, COLOR_SET } from '../constants.js';

/** 默认占位文本（无数据时） */
const NO_TIME = '--';

/**
 * 渲染输出（双行对齐版）
 */
export function render(ctx: RenderContext): void {
  const { stdin, usageData } = ctx;
  const isMiniMax = usageData?.provider === 'minimax';

  // ========== 第1行：5h Token │ 5h 剩余 │ MCP ==========
  const line1: string[] = [];

  // 1-1. 5h Token 进度条
  const tokenPct5h = usageData?.tokenPercent ?? 0;
  line1.push(`🔋5h:${formatProgressBar(tokenPct5h)} ${tokenPct5h.toString().padStart(3)}%`);

  // 1-2. 5h 剩余时间进度条
  if (usageData?.resetTime) {
    const info = formatResetTime(usageData.resetTime);
    if (info) {
      line1.push(`🔄5h:${formatProgressBar(info.percent)} ${info.text.padStart(TIME_PAD_WIDTH)}`);
    } else {
      line1.push(`🔄5h:${formatProgressBar(0)} ${NO_TIME.padStart(TIME_PAD_WIDTH)}`);
    }
  } else {
    line1.push(`🔄5h:${formatProgressBar(0)} ${NO_TIME.padStart(TIME_PAD_WIDTH)}`);
  }

  // 1-3. MCP / 语音 进度条
  const mcpPct = usageData?.mcpPercent ?? 0;
  const mcpLabel = isMiniMax ? '语音' : 'MCP';
  line1.push(`🌐${mcpLabel}:${formatProgressBar(mcpPct)} ${mcpPct.toString().padStart(3)}%`);

  // ========== 第2行：周 Token │ 周 剩余 │ 上下文 ==========
  const line2: string[] = [];

  // 2-1. 周 Token 进度条
  const weeklyTokenPct = usageData?.weeklyTokenPercent ?? 0;
  line2.push(`🔋周:${formatProgressBar(weeklyTokenPct)} ${weeklyTokenPct.toString().padStart(3)}%`);

  // 2-2. 周剩余时间进度条
  if (usageData?.weeklyResetTime) {
    const info = formatWeeklyResetTime(usageData.weeklyResetTime);
    if (info) {
      line2.push(`🔄周:${formatProgressBar(info.percent)} ${info.text.padStart(TIME_PAD_WIDTH)}`);
    } else {
      line2.push(`🔄周:${formatProgressBar(0)} ${NO_TIME.padStart(TIME_PAD_WIDTH)}`);
    }
  } else {
    line2.push(`🔄周:${formatProgressBar(0)} ${NO_TIME.padStart(TIME_PAD_WIDTH)}`);
  }

  // 2-3. 上下文 / 图像 进度条
  if (isMiniMax && usageData?.contextPercent !== undefined) {
    // MiniMax 模式：显示图像使用率
    const imgPct = usageData.contextPercent;
    line2.push(`📊图像:${formatProgressBar(imgPct)} ${imgPct.toString().padStart(3)}%`);
  } else {
    // 智谱模式：显示上下文窗口（无数据时显示 0%）
    const ctxStr = renderContextInfo(stdin);
    line2.push(ctxStr);
  }

  // 输出两行（用 │ 分隔对齐，整行统一绿色）
  console.log(`${COLOR_SET}${line1.join(' │ ')}`);
  console.log(`${COLOR_SET}${line2.join(' │ ')}`);
}

/**
 * 渲染上下文信息（无数据时返回 0% 而非 null）
 */
function renderContextInfo(stdin: StdinData): string {
  const cw = stdin.context_window;

  // 无上下文数据时返回 0% 占位
  if (!cw) {
    return `📊CTX:${formatProgressBar(0)}   0%`;
  }

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
      displayUsed = cached.totalUsed;
      displayPercent = Math.round((cached.totalUsed / cached.contextWindowSize) * 100);

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

  // 无数据时显示 0%（不再返回 null）
  const finalPercent = displayPercent ?? 0;

  return `📊CTX:${formatProgressBar(finalPercent)} ${finalPercent.toString().padStart(3)}%`;
}
