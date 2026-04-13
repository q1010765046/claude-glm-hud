/**
 * MiniMax API 集成
 * 调用 MiniMax API 获取套餐余量
 */

import { getAuthToken } from './config.js';
import { readCache, writeCache } from './cache.js';
import { UsageData } from './types.js';
import { MINIMAX_API_BASE, MINIMAX_USAGE_ENDPOINT } from './constants.js';
import { httpsGet, withRetry } from './http-agent.js';

const DEBUG = process.env.DEBUG === '1';

function debugLog(msg: string, data?: unknown): void {
  if (DEBUG) console.error(`[GLM-HUD::minimax-api] ${msg}`, data ?? '');
}

/**
 * MiniMax API 响应类型
 */
interface MiniMaxApiResponse {
  model_remains?: Array<{
    model_name: string;
    current_interval_total_count: number;
    current_interval_usage_count: number;
    remains_time?: number;
  }>;
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

/**
 * 从 model_remains 数组中查找指定模型
 */
function findModel(data: MiniMaxApiResponse, modelPrefix: string) {
  return data.model_remains?.find(m =>
    m.model_name.toLowerCase().startsWith(modelPrefix.toLowerCase())
  );
}

/**
 * 计算使用百分比
 */
function calculatePercent(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * 解析 API 响应为统一数据结构
 */
function parseApiResponse(data: MiniMaxApiResponse): UsageData | null {
  try {
    if (data.base_resp?.status_code !== 0) {
      debugLog('API 返回错误', data.base_resp);
      return null;
    }

    // 查找各个模型的数据
    const tokenModel = findModel(data, 'MiniMax-M');
    const speechModel = findModel(data, 'speech-hd');
    const imageModel = findModel(data, 'image-01');

    // 必须有主模型数据
    if (!tokenModel) {
      debugLog('未找到主模型数据');
      return null;
    }

    const result: UsageData = {
      tokenPercent: calculatePercent(
        tokenModel.current_interval_usage_count,
        tokenModel.current_interval_total_count
      ),
      provider: 'minimax',
    };

    // 剩余时间（毫秒)
    if (tokenModel.remains_time) {
      result.resetTime = Date.now() + tokenModel.remains_time;
      result.resetSeconds = Math.floor(tokenModel.remains_time / 1000);
    }

    // 语音使用率
    if (speechModel && speechModel.current_interval_total_count > 0) {
      result.mcpPercent = calculatePercent(
        speechModel.current_interval_usage_count,
        speechModel.current_interval_total_count
      );
    }

    // 图像使用率
    if (imageModel && imageModel.current_interval_total_count > 0) {
      result.contextPercent = calculatePercent(
        imageModel.current_interval_usage_count,
        imageModel.current_interval_total_count
      );
    }

    debugLog('API 解析结果', result);
    return result;
  } catch {
    debugLog('API 响应解析失败');
    return null;
  }
}

/**
 * 单次 MiniMax API 请求（不含重试，使用 keepAlive 连接复用）
 */
async function singleMiniMaxFetch(url: string, authToken: string): Promise<UsageData | null> {
  const body = await httpsGet(url, {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  });

  const data = JSON.parse(body) as MiniMaxApiResponse;
  return parseApiResponse(data);
}

/**
 * 调用 MiniMax API（带指数退避重试，应对 TLS 连接不稳定）
 */
export async function fetchMiniMaxApi(authToken: string): Promise<UsageData | null> {
  const url = `${MINIMAX_API_BASE}${MINIMAX_USAGE_ENDPOINT}`;
  debugLog('开始请求', url);
  const result = await withRetry(() => singleMiniMaxFetch(url, authToken));
  debugLog('请求结果', result ? '成功' : '失败');
  return result;
}

/**
 * 获取 MiniMax 使用率数据（带缓存）
 */
export async function getMiniMaxUsage(): Promise<UsageData | undefined> {
  // 先尝试读取缓存
  const cached = readCache('minimax');
  if (cached) {
    debugLog('缓存命中');
    return cached;
  }

  // 获取 AUTH_TOKEN
  const authToken = getAuthToken();
  if (!authToken) {
    debugLog('无 AUTH_TOKEN');
    return undefined;
  }

  // 调用 API
  const data = await fetchMiniMaxApi(authToken);

  if (data) {
    writeCache(data, 'minimax');
    return data;
  }

  // API 调用失败，返回失败标记
  const failureData: UsageData = {
    tokenPercent: 0,
    apiUnavailable: true,
    provider: 'minimax',
  };
  writeCache(failureData, 'minimax');
  return undefined;
}
