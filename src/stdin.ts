/**
 * stdin JSON 解析
 */

import { StdinData } from './types.js';

/**
 * 从 stdin 读取 JSON 数据
 */
export async function readStdin(): Promise<StdinData> {
  const chunks: Buffer[] = [];

  try {
    // 读取所有 stdin 数据
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf-8').trim();

    // 空输入返回空对象
    if (!raw) {
      return {};
    }

    // 解析 JSON
    return JSON.parse(raw) as StdinData;
  } catch (error) {
    // 解析失败返回空对象
    return {};
  }
}

/**
 * 从 stdin 获取上下文使用百分比
 */
export function getContextUsagePercent(stdin: StdinData): number | null {
  const cw = stdin.context_window;
  if (!cw) return null;

  // 优先使用 Claude Code 计算的百分比
  if (cw.used_percentage !== undefined) {
    return cw.used_percentage;
  }

  // 否则手动计算
  if (cw.context_window_size && cw.current_usage?.input_tokens) {
    return Math.round(
      (cw.current_usage.input_tokens / cw.context_window_size) * 100
    );
  }

  return null;
}

/**
 * 从 stdin 获取上下文窗口总大小
 */
export function getContextWindowSize(stdin: StdinData): number {
  return stdin.context_window?.context_window_size ?? 200_000;
}

/**
 * 从 stdin 获取已用 Token 数量
 */
export function getContextUsedTokens(stdin: StdinData): number {
  return stdin.context_window?.current_usage?.input_tokens ?? 0;
}

/**
 * 从 stdin 获取模型显示名称
 */
export function getModelDisplayName(stdin: StdinData): string {
  return stdin.model?.display_name ?? 'Claude';
}
