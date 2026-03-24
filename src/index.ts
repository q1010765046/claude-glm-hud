/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息
 */

import { readStdin } from './stdin.js';
import { getGlmUsage } from './glm-api.js';
import { getMiniMaxUsage } from './minimax-api.js';
import { render } from './render/index.js';
import { isMiniMaxModel } from './config.js';

/**
 * 主函数
 */
export async function main(): Promise<void> {
  try {
    // 1. 读取 stdin 数据
    const stdin = await readStdin();

    // 2. 根据模型选择 API 获取使用率数据
    const usageData = isMiniMaxModel()
      ? await getMiniMaxUsage()
      : await getGlmUsage();

    // 3. 渲染输出
    render({ stdin, usageData });
  } catch (error) {
    // 静默处理错误
  }
}

// 直接执行（用于调试）
main().catch(() => {});
