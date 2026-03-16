/**
 * 常量定义
 */

// API 配置
export const GLM_API_BASE = 'https://api.z.ai';
export const GLM_USAGE_ENDPOINT = '/api/monitor/usage/quota/limit';

// 缓存配置
export const CACHE_DIR = '.claude/plugins/claude-glm-hud';
export const CACHE_FILE = 'glm-usage-cache.json';
export const CACHE_TTL_MS = 60_000; // 成功: 60秒
export const CACHE_FAILURE_TTL_MS = 15_000; // 失败: 15秒

// ANSI 颜色代码
export const ANSI = {
  RESET: '\x1b[0m',
  DIM: '\x1b[2m',
  BOLD: '\x1b[1m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  CYAN: '\x1b[36m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
} as const;

// 进度条字符
export const PROGRESS_CHARS = {
  FILLED: '█',
  EMPTY: '░',
} as const;

// 默认进度条宽度
export const DEFAULT_BAR_WIDTH = 10;

// 上下文阈值
export const CONTEXT_THRESHOLDS = {
  LOW: 70,    // < 70% 绿色
  MEDIUM: 85, // 70-85% 黄色
  HIGH: 85,   // > 85% 红色
} as const;

// Token 数量格式化阈值
export const TOKEN_FORMAT = {
  MILLION: 1_000_000,
  THOUSAND: 1_000,
} as const;
