/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息
 *
 * 双模式运行：
 * - statusLine 模式（默认）：读缓存 + 渲染输出
 * - daemon 模式（--daemon）：后台定时获取 API 数据写入缓存
 */

import { readStdin } from './stdin.js';
import { readCache } from './cache.js';
import { render } from './render/index.js';
import { isMiniMaxModel } from './config.js';
import { ensureDaemonRunning, updateHeartbeat } from './daemon-manager.js';
import { runDaemon } from './daemon.js';

/**
 * statusLine 模式：读缓存 + 渲染
 */
async function statusLineMode(): Promise<void> {
  try {
    // 1. 确保守护进程在运行
    ensureDaemonRunning();

    // 2. 更新心跳（通知守护进程 statusLine 还在活跃）
    updateHeartbeat();

    // 3. 读取 stdin 数据
    const stdin = await readStdin();

    // 4. 从缓存读取使用率数据（不调 API）
    const provider = isMiniMaxModel() ? 'minimax' : 'glm';
    const usageData = readCache(provider) ?? undefined;

    // 5. 渲染输出
    render({ stdin, usageData });
  } catch {
    // 静默处理错误
  }
}

/**
 * 入口分发
 */
async function main(): Promise<void> {
  if (process.argv.includes('--daemon')) {
    // 守护进程模式：后台定时获取 API 数据
    await runDaemon();
  } else {
    // statusLine 模式：读缓存 + 渲染
    await statusLineMode();
  }
}

main().catch(() => {});
