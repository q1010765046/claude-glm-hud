/**
 * GLM API 集成
 * 调用智谱 AI API 获取 Token 使用情况
 */

import { getAuthToken } from './config.js';
import { readCache, writeCache } from './cache.js';
import { GlmUsageData } from './types.js';
import { GLM_API_BASE, GLM_USAGE_ENDPOINT } from './constants.js';

/**
 * GLM API 响应类型
 */
interface GlmApiResponse {
  code?: number;
  data?: {
    limits?: Array<{
      type: string;
      percentage?: number;
      nextResetTime?: number;
    }>;
  };
}

/**
 * 解析 API 响应
 */
function parseApiResponse(data: GlmApiResponse): GlmUsageData | null {
  try {
    const result: GlmUsageData = {
      tokenPercent: 0,
      mcpPercent: undefined,
      resetTime: undefined,
      apiUnavailable: false,
    };

    const limits = data?.data?.limits ?? [];
    let hasData = false;

    for (const limit of limits) {
      const type = limit.type;
      const percentage = limit.percentage;
      const resetTime = limit.nextResetTime;

      if (percentage === undefined) continue;

      if (type === 'TOKENS_LIMIT') {
        result.tokenPercent = Math.round(percentage);
        if (resetTime) {
          result.resetTime = new Date(resetTime).toISOString();
          result.resetSeconds = Math.max(0, Math.floor((resetTime - Date.now()) / 1000));
        }
        hasData = true;
      } else if (type === 'TIME_LIMIT') {
        result.mcpPercent = Math.round(percentage);
        hasData = true;
      }
    }

    return hasData ? result : null;
  } catch {
    return null;
  }
}

/**
 * 调用 GLM API
 */
async function fetchGlmApi(authToken: string): Promise<GlmUsageData | null> {
  const url = `${GLM_API_BASE}${GLM_USAGE_ENDPOINT}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5秒超时
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GlmApiResponse;
    return parseApiResponse(data);
  } catch {
    return null;
  }
}

/**
 * 获取 GLM 使用率数据（带缓存）
 */
export async function getGlmUsage(): Promise<GlmUsageData | undefined> {
  // 先尝试读取缓存
  const cached = readCache();
  if (cached) {
    return cached;
  }

  // 获取 AUTH_TOKEN
  const authToken = getAuthToken();
  if (!authToken) {
    return undefined;
  }

  // 调用 API
  const data = await fetchGlmApi(authToken);

  if (data) {
    // 写入缓存
    writeCache(data);
    return data;
  }

  // API 调用失败，返回失败标记
  const failureData: GlmUsageData = {
    tokenPercent: 0,
    apiUnavailable: true,
  };
  writeCache(failureData);
  return undefined;
}
