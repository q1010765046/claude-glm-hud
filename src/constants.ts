/**
 * 常量定义
 */

// API 配置
export const GLM_API_BASE = 'https://api.z.ai';
export const GLM_USAGE_ENDPOINT = '/api/monitor/usage/quota/limit';

// 缓存配置
export const CACHE_DIR = '.claude/plugins/claude-glm-hud';
export const CACHE_FILE = 'glm-usage-cache.json';

// 刷新配置
export const REFRESH_INTERVAL_MS = 30_000;    // 缓存刷新间隔: 30 秒
export const FETCH_LOCK_TIMEOUT_MS = 10_000;   // fetch 锁超时: 10 秒

// 颜色配置
export const COLOR_RGB = "134;239;172";
export const COLOR_SET = `\x1b[38;2;${COLOR_RGB}m`;
export const COLOR_RESET = "\x1b[0m";

// 进度条配置
export const BAR_WIDTH = 25;

// 时间文本对齐宽度（padStart 用）
export const TIME_PAD_WIDTH = 6;

// 5小时周期（秒）
export const CYCLE_SECONDS = 18000;

// 周周期（秒，7天）
export const WEEKLY_CYCLE_SECONDS = 604800;

// MiniMax API 配置
export const MINIMAX_API_BASE = 'https://www.minimaxi.com';
export const MINIMAX_USAGE_ENDPOINT = '/v1/api/openplatform/coding_plan/remains';
