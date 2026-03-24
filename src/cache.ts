/**
 * 跨进程缓存管理
 * 因为每次渲染都是新进程，需要文件缓存来避免频繁 API 调用
 */

import { join } from 'path';
import { homedir } from 'os';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'fs';
import { CacheFile, UsageData } from './types.js';
import { CACHE_DIR, CACHE_FILE, CACHE_TTL_MS, CACHE_FAILURE_TTL_MS } from './constants.js';

/**
 * 上下文缓存数据结构
 */
interface ContextCacheData {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalUsed: number;
  contextWindowSize: number;
  timestamp: number;
}

/**
 * 获取缓存文件路径
 */
function getCachePath(): string {
  return join(homedir(), CACHE_DIR, CACHE_FILE);
}

/**
 * 获取上下文缓存文件路径
 */
function getContextCachePath(): string {
  return join(homedir(), CACHE_DIR, 'context-cache.json');
}

/**
 * 读取缓存
 * @param expectedProvider 期望的数据来源，用于验证缓存是否匹配
 */
export function readCache(expectedProvider?: 'glm' | 'minimax'): UsageData | null {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const raw = readFileSync(cachePath, 'utf-8');
    const cache: CacheFile = JSON.parse(raw);

    // 如果指定了 provider，验证缓存是否匹配
    if (expectedProvider && cache.provider && cache.provider !== expectedProvider) {
      return null;
    }

    const now = Date.now();
    const age = now - cache.timestamp;

    // 根据状态使用不同 TTL
    const ttl = cache.data.apiUnavailable
      ? CACHE_FAILURE_TTL_MS
      : CACHE_TTL_MS;

    if (age >= ttl) {
      return null;
    }

    return cache.data;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 */
export function writeCache(data: UsageData, provider?: 'glm' | 'minimax'): void {
  const cachePath = getCachePath();
  const cacheDir = join(homedir(), CACHE_DIR);

  try {
    // 确保缓存目录存在
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const cache: CacheFile = {
      provider: provider ?? data.provider,
      data,
      timestamp: Date.now(),
    };

    writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
  } catch {
    // 静默失败
  }
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  const cachePath = getCachePath();

  if (existsSync(cachePath)) {
    try {
      unlinkSync(cachePath);
    } catch {
      // 静默失败
    }
  }
}

/**
 * 读取上下文缓存
 */
export function readContextCache(): ContextCacheData | null {
  const cachePath = getContextCachePath();

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const raw = readFileSync(cachePath, 'utf-8');
    const cache: ContextCacheData = JSON.parse(raw);

    // 上下文缓存有效期 10 秒
    const now = Date.now();
    const age = now - cache.timestamp;

    if (age >= 10_000) {
      return null;
    }

    return cache;
  } catch {
    return null;
  }
}

/**
 * 写入上下文缓存
 */
export function writeContextCache(data: ContextCacheData): void {
  const cachePath = getContextCachePath();
  const cacheDir = join(homedir(), CACHE_DIR);

  try {
    // 确保缓存目录存在
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
  } catch {
    // 静默失败
  }
}
