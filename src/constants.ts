/**
 * 常量定义（与老版本保持一致）
 */

// API 配置
export const GLM_API_BASE = 'https://api.z.ai';
export const GLM_USAGE_ENDPOINT = '/api/monitor/usage/quota/limit';

// 缓存配置
export const CACHE_DIR = '.claude/plugins/claude-glm-hud';
export const CACHE_FILE = 'glm-usage-cache.json';
export const CACHE_TTL_MS = 60_000; // 成功: 60秒
export const CACHE_FAILURE_TTL_MS = 15_000; // 失败: 15秒

// 颜色配置（与老版本一致：薄荷绿）
export const COLOR_RGB = "134;239;172";
export const COLOR_SET = `\x1b[38;2;${COLOR_RGB}m`;
export const COLOR_RESET = "\x1b[0m";

// 进度条配置
export const BAR_WIDTH = 20; // 老版本：20

// 5小时周期（秒）
export const CYCLE_SECONDS = 18000;

// 守护进程配置
export const DAEMON_PID_FILE = 'daemon.pid';
export const HEARTBEAT_FILE = 'heartbeat';
export const DAEMON_INTERVAL_MS = 60_000;    // 守护进程获取间隔: 60秒
export const HEARTBEAT_TIMEOUT_MS = 300_000;  // 心跳超时: 5分钟

// MiniMax API 配置
export const MINIMAX_API_BASE = 'https://www.minimaxi.com';
export const MINIMAX_USAGE_ENDPOINT = '/v1/api/openplatform/coding_plan/remains';
