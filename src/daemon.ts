/**
 * 守护进程工作循环
 * 独立后台进程：每 60 秒获取 API 数据写入缓存
 * 通过心跳机制自动退出：statusLine 不再更新心跳时，守护进程在 5 分钟后退出
 */

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { readPidFile, writePidFile, removePidFile, getHeartbeatPath, isProcessAlive } from './daemon-manager.js';
import { HEARTBEAT_TIMEOUT_MS, DAEMON_INTERVAL_MS } from './constants.js';
import { fetchGlmApi } from './glm-api.js';
import { fetchMiniMaxApi } from './minimax-api.js';
import { getAuthToken } from './config.js';
import { isMiniMaxModel } from './config.js';
import { writeCache, readCache } from './cache.js';
import { UsageData } from './types.js';
// http-agent.ts 模块被 glm-api / minimax-api 导入时自动初始化 keepAlive Agent

const DEBUG = process.env.DEBUG === '1';

function debugLog(msg: string, data?: unknown): void {
  if (DEBUG) console.error(`[GLM-HUD::daemon] ${msg}`, data ?? '');
}

/**
 * 读取心跳时间戳
 */
function readHeartbeat(): number | null {
  const path = getHeartbeatPath();
  if (!existsSync(path)) return null;
  try {
    const ts = parseInt(readFileSync(path, 'utf-8').trim(), 10);
    return isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

/**
 * 检查心跳是否超时
 * 返回 true 表示心跳正常
 */
function isHeartbeatAlive(): boolean {
  const heartbeat = readHeartbeat();
  if (heartbeat === null) {
    // 没有心跳文件，可能是刚启动还没来得及写入，给一个宽限期
    return true;
  }
  return (Date.now() - heartbeat) < HEARTBEAT_TIMEOUT_MS;
}

/**
 * 检查自己是否仍然是 PID 文件中记录的进程
 * 如果不是，说明被新的守护进程替换了，应该退出
 */
function isStillOwner(): boolean {
  const pidFromFile = readPidFile();
  return pidFromFile === process.pid;
}

/**
 * 执行一次 API 获取并写入缓存
 * 失败时不覆盖已有有效数据，避免因短暂网络抖动导致显示中断
 */
async function fetchAndCache(): Promise<void> {
  const authToken = getAuthToken();
  if (!authToken) {
    debugLog('无 AUTH_TOKEN，跳过获取');
    return;
  }

  const isMiniMax = isMiniMaxModel();
  const provider = isMiniMax ? 'minimax' : 'glm';
  debugLog(`开始获取 ${provider} 数据`);

  try {
    const data = isMiniMax
      ? await fetchMiniMaxApi(authToken)
      : await fetchGlmApi(authToken);

    if (data) {
      writeCache(data, provider);
      debugLog('获取成功，已写入缓存');
    } else {
      // API 返回空，只有在缓存中无有效数据时才写入失败标记
      const existing = readCache(provider);
      if (!existing) {
        const failureData: UsageData = {
          tokenPercent: 0,
          apiUnavailable: true,
          provider,
        };
        writeCache(failureData, provider);
        debugLog('获取失败，无已有缓存，写入失败标记');
      } else {
        debugLog('获取失败，保留已有缓存数据');
      }
    }
  } catch {
    debugLog('获取异常，不覆盖已有缓存');
  }
}

/**
 * 清理并退出
 */
function cleanup(): void {
  // 只有自己是 PID 文件的主人时才清理
  const pidFromFile = readPidFile();
  if (pidFromFile === process.pid) {
    removePidFile();
  }
  process.exit(0);
}

/**
 * 守护进程主循环
 */
export async function runDaemon(): Promise<void> {
  // 注册退出信号处理
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  // Windows 没有 SIGHUP，但注册以防万一
  process.on('SIGHUP', cleanup);

  // 写入 PID 文件
  writePidFile(process.pid);

  // 立即执行一次获取
  await fetchAndCache();

  // 定时循环（setInterval 默认保持进程存活）
  setInterval(async () => {
    // 检查心跳
    if (!isHeartbeatAlive()) {
      cleanup();
      return;
    }

    // 检查 PID 归属
    if (!isStillOwner()) {
      process.exit(0);
      return;
    }

    // 获取并缓存
    await fetchAndCache();
  }, DAEMON_INTERVAL_MS);
}
