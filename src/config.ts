/**
 * 配置管理
 * 进程生命周期内缓存 settings.json 解析结果，避免重复 IO
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME_DIR = homedir();
const CONFIG_DIR = join(HOME_DIR, '.claude');
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

// 缓存解析结果，避免每次调用都重新读文件
let cachedSettings: Record<string, unknown> | null = null;

/**
 * 读取并缓存 settings.json
 */
function loadSettings(): Record<string, unknown> | null {
  if (cachedSettings !== null) {
    return cachedSettings;
  }

  if (!existsSync(SETTINGS_FILE)) {
    return null;
  }

  try {
    const raw = readFileSync(SETTINGS_FILE, 'utf-8');
    cachedSettings = JSON.parse(raw) as Record<string, unknown>;
    return cachedSettings;
  } catch {
    return null;
  }
}

/**
 * 从 settings.json 获取 AUTH_TOKEN
 */
export function getAuthToken(): string | null {
  const settings = loadSettings();
  const env = settings?.env as Record<string, unknown> | undefined;
  return (env?.ANTHROPIC_AUTH_TOKEN as string) ?? null;
}

/**
 * 从 settings.json 获取 ANTHROPIC_MODEL
 */
export function getAnthropicModel(): string | null {
  const settings = loadSettings();
  const env = settings?.env as Record<string, unknown> | undefined;
  return (env?.ANTHROPIC_MODEL as string) ?? null;
}

/**
 * 判断当前是否为 MiniMax 模型
 */
export function isMiniMaxModel(): boolean {
  const model = getAnthropicModel();
  if (!model) return false;
  return model.toLowerCase().includes('minimax');
}

/**
 * 获取 AUTH_TOKEN 的指纹（用于缓存失效检测）
 * 取 token 的简单哈希前 8 位，切换账号时缓存自动失效
 */
export function getTokenFingerprint(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}
