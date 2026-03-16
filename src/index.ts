/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI Token 使用率和上下文窗口信息
 */

import { readStdin } from './stdin.js';
import { getGlmUsage } from './glm-api.js';
import { render } from './render/index.js';

/**
 * 主函数
 */
export async function main(): Promise<void> {
  try {
    // 1. 读取 stdin 数据
    const stdin = await readStdin();

    // 2. 获取 GLM 使用率数据（异步，不阻塞渲染）
    const glmUsage = await getGlmUsage();

    // 3. 渲染输出
    render({ stdin, glmUsage });
  } catch (error) {
    // 静默处理错误
  }
}

// 直接执行（用于调试）
main().catch(() => {});
