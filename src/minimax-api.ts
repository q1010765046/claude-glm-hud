/**
 * MiniMax API 集成
 * 调用 MiniMax API 获取套餐余量
 */

import { getAuthToken } from './config.js';
import { readCache, writeCache } from './cache.js';
import { UsageData } from './types.js';
import { MINIMAX_API_BASE, MINIMAX_USAGE_ENDPOINT } from './constants.js';

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
      return null;
    }

    // 查找各个模型的数据
    const tokenModel = findModel(data, 'MiniMax-M');
    const speechModel = findModel(data, 'speech-hd');
    const imageModel = findModel(data, 'image-01');

    // 必须有主模型数据
    if (!tokenModel) {
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

    return result;
  } catch {
    return null;
  }
}

/**
 * 调用 MiniMax API
 */
async function fetchMiniMaxApi(authToken: string): Promise<UsageData | null> {
  const url = `${MINIMAX_API_BASE}${MINIMAX_USAGE_ENDPOINT}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5秒超时
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MiniMaxApiResponse;
    return parseApiResponse(data);
  } catch {
    return null;
  }
}

/**
 * 获取 MiniMax 使用率数据（带缓存）
 */
export async function getMiniMaxUsage(): Promise<UsageData | undefined> {
  // 先尝试读取缓存
  const cached = readCache('minimax');
  if (cached) {
    return cached;
  }

  // 获取 AUTH_TOKEN
  const authToken = getAuthToken();
  if (!authToken) {
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
