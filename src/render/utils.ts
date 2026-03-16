/**
 * 渲染工具函数（与老版本保持一致）
 */

import { COLOR_SET, COLOR_RESET, BAR_WIDTH, CYCLE_SECONDS } from '../constants.js';

/**
 * 格式化进度条（与老版本一致）
 */
export function formatProgressBar(percent: number): string {
  const filled = Math.floor((percent / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return `${COLOR_SET}[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * 格式化重置时间（与老版本一致）
 */
export function formatResetTime(resetTimestampMs: number): { text: string; percent: number } | null {
  if (!resetTimestampMs) return null;

  try {
    const resetDt = new Date(resetTimestampMs);
    const now = new Date();
    const delta = resetDt.getTime() - now.getTime();
    const totalSeconds = Math.floor(delta / 1000);

    if (totalSeconds < 0) {
      return { text: '已重置', percent: 0 };
    }

    // 5小时为刷新周期，用剩余时间计算进度
    const usedPercent = Math.min(100, Math.max(0, Math.floor((CYCLE_SECONDS - totalSeconds) * 100 / CYCLE_SECONDS)));

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes}分`);

    const timeText = parts.length > 0 ? parts.join('') : '0分';
    return { text: timeText, percent: usedPercent };
  } catch {
    return null;
  }
}

/**
 * 格式化 Token 数量
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return `${tokens}`;
}
