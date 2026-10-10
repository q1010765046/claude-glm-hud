/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息
 *
 * statusLine 模式：读取缓存 + 过期时直接调 API + 渲染输出
 * 无后台进程，通过 fetchingSince 锁机制防止雷群请求
 */

import { readStdin } from './stdin.js';
import { render } from './render/index.js';
import { isMiniMaxModel, getAuthToken, getBaseUrl, isZhipuBaseUrl } from './config.js';
import {
  readRawCache,
  readCache,
  shouldRefresh,
  acquireFetchLock,
  releaseFetchLock,
  getCachePath,
} from './cache.js';
import { fetchGlmApi } from './glm-api.js';
import { fetchMiniMaxApi } from './minimax-api.js';

/**
 * statusLine 模式：缓存读取 + 按需 API 刷新 + 渲染
 */
async function statusLineMode(): Promise<void> {
  try {
    // 1. 读取 stdin 数据
    const stdin = await readStdin();

    // 2. 判断供应商并读取原始缓存
    const provider = isMiniMaxModel() ? 'minimax' : 'glm';
    const { cache } = readRawCache(provider);

    // 3. 缓存过期时直接调 API 刷新
    if (shouldRefresh(cache)) {
      const authToken = getAuthToken();
      if (authToken) {
        const cachePath = getCachePath();
        acquireFetchLock(cachePath, cache);
        try {
          const data = provider === 'minimax'
            ? await fetchMiniMaxApi(authToken)
            : await fetchGlmApi(authToken);
          if (data) {
            releaseFetchLock(cachePath, data, provider);
          }
        } catch {
          // API 失败不覆盖旧缓存，fetch 锁在 FETCH_LOCK_TIMEOUT_MS 后自动失效
        }
      }
    }

    // 4. 重新读取最新缓存并渲染
    const usageData = readCache(provider);
    render({ stdin, usageData: usageData ?? undefined });
  } catch {
    // 静默处理错误
  }
}

async function main(): Promise<void> {
  // 非智谱 baseURL 时直接退出（stdout 无输出），隐藏状态栏
  if (!isZhipuBaseUrl(getBaseUrl())) return;
  await statusLineMode();
}

main().catch(() => {});
