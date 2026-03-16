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
 * GLM API 使用率数据
 */
export interface GlmUsageData {
  tokenPercent: number;
  mcpPercent?: number;
  resetTime?: number; // 毫秒时间戳
  resetSeconds?: number;
  planName?: string;
  apiUnavailable?: boolean;
}

/**
 * 缓存文件结构
 */
export interface CacheFile {
  data: GlmUsageData;
  timestamp: number;
}

/**
 * 渲染上下文
 */
export interface RenderContext {
  stdin: StdinData;
  glmUsage?: GlmUsageData;
}
