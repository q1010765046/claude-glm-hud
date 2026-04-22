/**
 * 渲染工具函数（双行对齐版）
 */

import { COLOR_SET, COLOR_RESET, BAR_WIDTH, CYCLE_SECONDS, WEEKLY_CYCLE_SECONDS, TIME_PAD_WIDTH } from '../constants.js';

/**
 * 格式化进度条
 */
export function formatProgressBar(percent: number): string {
  const filled = Math.floor((percent / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return `${COLOR_SET}[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * 格式化5小时重置时间
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

    const timeText = formatDuration(totalSeconds);
    return { text: timeText, percent: usedPercent };
  } catch {
    return null;
  }
}

/**
 * 格式化周重置时间（新增：用于第2行周剩余进度条）
 */
export function formatWeeklyResetTime(resetTimestampMs: number): { text: string; percent: number } | null {
  if (!resetTimestampMs) return null;

  try {
    const delta = resetTimestampMs - Date.now();
    const totalSeconds = Math.max(0, Math.floor(delta / 1000));

    if (totalSeconds <= 0) {
      return { text: '已重置', percent: 0 };
    }

    // 7天为刷新周期
    const usedPercent = Math.min(100, Math.max(0, Math.floor((WEEKLY_CYCLE_SECONDS - totalSeconds) * 100 / WEEKLY_CYCLE_SECONDS)));

    const timeText = formatDuration(totalSeconds);
    return { text: timeText, percent: usedPercent };
  } catch {
    return null;
  }
}

/**
 * 格式化时间间隔（英文缩写：d/h/m）
 * 有天数时省略分钟，控制最大长度为6字符
 */
export function formatDuration(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    // 有天数时省略分钟，避免文本过长
  } else {
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);
  }

  return parts.length > 0 ? parts.join('') : '0m';
}

/**
 * 格式化 Token 数量
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return `${tokens}`;
}
