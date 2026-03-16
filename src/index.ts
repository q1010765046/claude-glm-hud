/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI Token 使用率和上下文窗口信息
 */

import { readStdin } from './stdin.js';
import { loadConfig } from './config.js';
import { getGlmUsage } from './glm-api.js';
import { render } from './render/index.js';

/**
 * 主函数
 */
export async function main(): Promise<void> {
  try {
    // 1. 读取 stdin 数据
    const stdin = await readStdin();

    // 2. 加载配置
    const config = loadConfig();

    // 3. 获取 GLM 使用率数据（异步，不阻塞渲染）
    const glmUsage = await getGlmUsage();

    // 4. 构建渲染上下文
    const context = {
      stdin,
      config,
      glmUsage,
    };

    // 5. 渲染输出
    render(context);
  } catch (error) {
    // 调试输出
    // console.error('[GLM-HUD 错误]', error);
  }
}

// 直接执行（用于调试）
main().catch(() => {});
