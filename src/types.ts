/**
 * 类型定义
 */

/**
 * stdin JSON 数据结构
 */
export interface StdinData {
  model?: {
    id?: string;
    display_name?: string;
  };
  context_window?: {
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    used_percentage?: number;
  };
  cwd?: string;
  transcript_path?: string;
}

/**
 * 统一使用率数据（支持智谱和 MiniMax）
 */
export interface UsageData {
  tokenPercent: number;          // 5小时 token 使用百分比
  weeklyTokenPercent?: number;   // 周 token 使用百分比
  mcpPercent?: number;
  contextPercent?: number;  // MiniMax: 图像使用率
  resetTime?: number; // 5小时刷新时间（毫秒时间戳）
  weeklyResetTime?: number; // 周限额刷新时间（毫秒时间戳）
  resetSeconds?: number;
  apiUnavailable?: boolean;
  provider?: 'glm' | 'minimax';  // 数据来源，用于渲染层判断标签
}

/**
 * 缓存文件结构
 */
export interface CacheFile {
  provider?: 'glm' | 'minimax';  // 新增：区分数据来源
  tokenFingerprint?: string;     // Token 指纹，切换账号时缓存自动失效
  data: UsageData;
  timestamp: number;
}

/**
 * 渲染上下文
 */
export interface RenderContext {
  stdin: StdinData;
  usageData?: UsageData;  // 重命名
}

/**
 * 上下文缓存数据结构
 */
export interface ContextCacheData {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalUsed: number;
  contextWindowSize: number;
  timestamp: number;
}
