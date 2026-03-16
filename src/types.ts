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
  resetTime?: string;
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
  config: HudConfig;
  glmUsage?: GlmUsageData;
}

/**
 * 插件配置
 */
export interface HudConfig {
  lineLayout: 'compact' | 'expanded';
  showSeparators: boolean;
  display: {
    showModel: boolean;
    showContext: boolean;
    showContextBar: boolean;
    showTokenBreakdown: boolean;
    showUsage: boolean;
    showMcp: boolean;
    showDuration: boolean;
  };
  colors: {
    low: string;
    medium: string;
    high: string;
  };
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: HudConfig = {
  lineLayout: 'compact',
  showSeparators: false,
  display: {
    showModel: true,
    showContext: true,
    showContextBar: true,
    showTokenBreakdown: true,
    showUsage: true,
    showMcp: true,
    showDuration: false,
  },
  colors: {
    low: 'green',
    medium: 'yellow',
    high: 'red',
  },
};
