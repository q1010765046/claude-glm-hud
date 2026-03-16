/**
 * 配置管理
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { HudConfig, DEFAULT_CONFIG } from './types.js';

const HOME_DIR = homedir();
const CONFIG_DIR = join(HOME_DIR, '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'claude-glm-hud.json');

/**
 * 加载配置
 */
export function loadConfig(): HudConfig {
  // 如果配置文件不存在，返回默认配置
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const userConfig = JSON.parse(raw) as Partial<HudConfig>;

    // 合并用户配置与默认配置
    return mergeConfig(userConfig);
  } catch {
    // 解析失败返回默认配置
    return DEFAULT_CONFIG;
  }
}

/**
 * 保存配置
 */
export function saveConfig(config: HudConfig): void {
  try {
    // 确保配置目录存在
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('[配置保存失败]', error);
  }
}

/**
 * 合并配置
 */
function mergeConfig(userConfig: Partial<HudConfig>): HudConfig {
  return {
    lineLayout: userConfig.lineLayout ?? DEFAULT_CONFIG.lineLayout,
    showSeparators: userConfig.showSeparators ?? DEFAULT_CONFIG.showSeparators,
    display: {
      showModel: userConfig.display?.showModel ?? DEFAULT_CONFIG.display.showModel,
      showContext: userConfig.display?.showContext ?? DEFAULT_CONFIG.display.showContext,
      showContextBar: userConfig.display?.showContextBar ?? DEFAULT_CONFIG.display.showContextBar,
      showTokenBreakdown: userConfig.display?.showTokenBreakdown ?? DEFAULT_CONFIG.display.showTokenBreakdown,
      showUsage: userConfig.display?.showUsage ?? DEFAULT_CONFIG.display.showUsage,
      showMcp: userConfig.display?.showMcp ?? DEFAULT_CONFIG.display.showMcp,
      showDuration: userConfig.display?.showDuration ?? DEFAULT_CONFIG.display.showDuration,
    },
    colors: {
      low: userConfig.colors?.low ?? DEFAULT_CONFIG.colors.low,
      medium: userConfig.colors?.medium ?? DEFAULT_CONFIG.colors.medium,
      high: userConfig.colors?.high ?? DEFAULT_CONFIG.colors.high,
    },
  };
}

/**
 * 获取 AUTH_TOKEN
 */
export function getAuthToken(): string | null {
  const settingsFile = join(CONFIG_DIR, 'settings.json');

  if (!existsSync(settingsFile)) {
    return null;
  }

  try {
    const raw = readFileSync(settingsFile, 'utf-8');
    const settings = JSON.parse(raw);
    return settings.env?.ANTHROPIC_AUTH_TOKEN ?? null;
  } catch {
    return null;
  }
}
