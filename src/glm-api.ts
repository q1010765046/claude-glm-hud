/**
 * GLM API 集成
 * 调用智谱 AI API 获取 Token 使用情况
 */

import { UsageData } from './types.js';
import { GLM_API_BASE, GLM_USAGE_ENDPOINT } from './constants.js';
import { httpsGet, withRetry } from './http-agent.js';

const DEBUG = process.env.DEBUG === '1';

function debugLog(msg: string, data?: unknown): void {
  if (DEBUG) console.error(`[GLM-HUD::glm-api] ${msg}`, data ?? '');
}

/**
 * GLM API 响应类型
 */
interface GlmApiResponse {
  code?: number;
  data?: {
    limits?: Array<{
      type: string;
      unit?: number;
      number?: number;
      percentage?: number;
      nextResetTime?: number;
    }>;
  };
}

/**
 * 解析 API 响应
 */
function parseApiResponse(data: GlmApiResponse): UsageData | null {
  try {
    const result: UsageData = {
      tokenPercent: 0,
      mcpPercent: undefined,
      resetTime: undefined,
      weeklyResetTime: undefined,
      apiUnavailable: false,
      provider: 'glm',
    };

    const limits = data?.data?.limits ?? [];
    let hasData = false;

    for (const limit of limits) {
      const type = limit.type;
      const unit = limit.unit;
      const percentage = limit.percentage;
      const resetTime = limit.nextResetTime;

      if (type === 'TOKENS_LIMIT' && unit === 3) {
        // 5小时滚动周期：token 使用百分比和刷新时间
        if (percentage !== undefined) {
          result.tokenPercent = Math.round(percentage);
        }
        if (resetTime) {
          result.resetTime = resetTime;
          result.resetSeconds = Math.max(0, Math.floor((resetTime - Date.now()) / 1000));
        }
        hasData = true;
      } else if (type === 'TOKENS_LIMIT' && unit === 6) {
        // 周限额：token 使用百分比和刷新时间
        if (percentage !== undefined) {
          result.weeklyTokenPercent = Math.round(percentage);
        }
        if (resetTime) {
          result.weeklyResetTime = resetTime;
        }
        hasData = true;
      } else if (type === 'TIME_LIMIT') {
        // MCP 等时间限制
        if (percentage !== undefined) {
          result.mcpPercent = Math.round(percentage);
        }
        hasData = true;
      }
    }

    debugLog('API 解析结果', hasData ? result : '无有效数据');
    return hasData ? result : null;
  } catch {
    debugLog('API 响应解析失败');
    return null;
  }
}

/**
 * 单次 API 请求（不含重试，使用 keepAlive 连接复用）
 */
async function singleFetch(url: string, authToken: string): Promise<UsageData | null> {
  const body = await httpsGet(url, {
    'Authorization': authToken,
    'Content-Type': 'application/json',
  });

  const data = JSON.parse(body) as GlmApiResponse;
  return parseApiResponse(data);
}

/**
 * 调用 GLM API（带指数退避重试，应对 TLS 连接不稳定）
 */
export async function fetchGlmApi(authToken: string): Promise<UsageData | null> {
  const url = `${GLM_API_BASE}${GLM_USAGE_ENDPOINT}`;
  debugLog('开始请求', url);
  const result = await withRetry(() => singleFetch(url, authToken));
  debugLog('请求结果', result ? '成功' : '失败');
  return result;
}

