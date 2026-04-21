/**
 * 跨进程缓存管理 + fetch 锁机制
 * statusLine 每次被触发时读取缓存，过期时直接调 API
 * 使用 fetchingSince 防止多个 statusLine 进程同时调 API（雷群保护）
 */

import { join } from 'path';
import { homedir } from 'os';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { CacheFile, UsageData, ContextCacheData } from './types.js';
import { CACHE_DIR, CACHE_FILE, REFRESH_INTERVAL_MS, FETCH_LOCK_TIMEOUT_MS } from './constants.js';
import { getTokenFingerprint } from './config.js';

const DEBUG = process.env.DEBUG === '1';

function debugLog(msg: string, data?: unknown): void {
  if (DEBUG) console.error(`[GLM-HUD::cache] ${msg}`, data ?? '');
}

/**
 * 获取缓存文件路径
 */
export function getCachePath(): string {
  return join(homedir(), CACHE_DIR, CACHE_FILE);
}

/**
 * 读取原始缓存（包含锁信息和完整 CacheFile）
 * 用于 shouldRefresh 判断和锁机制
 */
export function readRawCache(expectedProvider?: 'glm' | 'minimax'): {
  cache: CacheFile | null;
  data: UsageData | null;
} {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) return { cache: null, data: null };

  try {
    const raw = readFileSync(cachePath, 'utf-8');
    const cache: CacheFile = JSON.parse(raw);

    // provider 校验
    if (expectedProvider && cache.provider && cache.provider !== expectedProvider) {
      debugLog('provider 不匹配', { expected: expectedProvider, actual: cache.provider });
      return { cache: null, data: null };
    }

    // Token 指纹校验
    const currentFingerprint = getTokenFingerprint();
    if (currentFingerprint && cache.tokenFingerprint && cache.tokenFingerprint !== currentFingerprint) {
      debugLog('Token 指纹不匹配，缓存失效');
      return { cache: null, data: null };
    }

    return { cache, data: cache.data };
  } catch {
    debugLog('缓存读取失败');
    return { cache: null, data: null };
  }
}

/**
 * 读取缓存（仅返回 UsageData）
 * 兼容 glm-api.ts 的 getGlmUsage() 调用
 */
export function readCache(expectedProvider?: 'glm' | 'minimax'): UsageData | null {
  return readRawCache(expectedProvider).data;
}

/**
 * 判断是否需要刷新缓存
 */
export function shouldRefresh(cache: CacheFile | null): boolean {
  if (!cache) return true;
  // fetch 锁未超时，跳过（防止雷群）
  if (cache.fetchingSince && Date.now() - cache.fetchingSince < FETCH_LOCK_TIMEOUT_MS) {
    return false;
  }
  // 缓存超过刷新间隔，需要刷新
  return Date.now() - cache.timestamp >= REFRESH_INTERVAL_MS;
}

/**
 * 获取 fetch 锁
 * 写入 fetchingSince 时间戳，其他进程看到后会跳过 API 调用
 */
export function acquireFetchLock(cachePath: string, existingCache: CacheFile | null): void {
  const cache: CacheFile = existingCache ?? {
    data: { tokenPercent: 0, apiUnavailable: true, provider: 'glm' },
    timestamp: 0,
  };
  cache.fetchingSince = Date.now();

  const cacheDir = join(homedir(), CACHE_DIR);
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
  debugLog('已获取 fetch 锁');
}

/**
 * 释放 fetch 锁 + 写入新数据
 * 不写入 fetchingSince = 释放锁
 */
export function releaseFetchLock(cachePath: string, data: UsageData, provider: string): void {
  const cache: CacheFile = {
    provider,
    tokenFingerprint: getTokenFingerprint() ?? undefined,
    data,
    timestamp: Date.now(),
  };
  writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
  debugLog('已释放 fetch 锁，写入新数据');
}

/**
 * 写入缓存（兼容 glm-api.ts 的 getGlmUsage() 调用）
 */
export function writeCache(data: UsageData, provider?: 'glm' | 'minimax'): void {
  const cachePath = getCachePath();
  const cacheDir = join(homedir(), CACHE_DIR);

  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

    const cache: CacheFile = {
      provider: provider ?? data.provider,
      tokenFingerprint: getTokenFingerprint() ?? undefined,
      data,
      timestamp: Date.now(),
    };
    writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
  } catch {
    // 静默失败
  }
}

/**
 * 读取上下文缓存
 */
export function readContextCache(): ContextCacheData | null {
  const cachePath = join(homedir(), CACHE_DIR, 'context-cache.json');
  if (!existsSync(cachePath)) return null;

  try {
    const raw = readFileSync(cachePath, 'utf-8');
    const cache: ContextCacheData = JSON.parse(raw);
    if (Date.now() - cache.timestamp >= 10_000) return null;
    return cache;
  } catch {
    return null;
  }
}

/**
 * 写入上下文缓存
 */
export function writeContextCache(data: ContextCacheData): void {
  const cachePath = join(homedir(), CACHE_DIR, 'context-cache.json');
  const cacheDir = join(homedir(), CACHE_DIR);

  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
  } catch {
    // 静默失败
  }
}
