/**
 * 配置管理
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME_DIR = homedir();
const CONFIG_DIR = join(HOME_DIR, '.claude');
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

/**
 * 从 settings.json 获取 AUTH_TOKEN
 */
export function getAuthToken(): string | null {
  if (!existsSync(SETTINGS_FILE)) {
    return null;
  }

  try {
    const raw = readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(raw);
    return settings.env?.ANTHROPIC_AUTH_TOKEN ?? null;
  } catch {
    return null;
  }
}

/**
 * 从 settings.json 获取 ANTHROPIC_MODEL
 */
export function getAnthropicModel(): string | null {
  if (!existsSync(SETTINGS_FILE)) {
    return null;
  }

  try {
    const raw = readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(raw);
    return settings.env?.ANTHROPIC_MODEL ?? null;
  } catch {
    return null;
  }
}

/**
 * 判断当前是否为 MiniMax 模型
 */
export function isMiniMaxModel(): boolean {
  const model = getAnthropicModel();
  if (!model) return false;
  return model.toLowerCase().includes('minimax');
}
