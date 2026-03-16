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
} from 'fs';
import { CacheFile, GlmUsageData } from './types.js';
import { CACHE_DIR, CACHE_FILE, CACHE_TTL_MS, CACHE_FAILURE_TTL_MS } from './constants.js';

/**
 * 获取缓存文件路径
 */
function getCachePath(): string {
  return join(homedir(), CACHE_DIR, CACHE_FILE);
}

/**
 * 读取缓存
 */
export function readCache(): GlmUsageData | null {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const raw = readFileSync(cachePath, 'utf-8');
    const cache: CacheFile = JSON.parse(raw);

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
export function writeCache(data: GlmUsageData): void {
  const cachePath = getCachePath();
  const cacheDir = join(homedir(), CACHE_DIR);

  try {
    // 确保缓存目录存在
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const cache: CacheFile = {
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
      // 删除缓存文件
      // 注意：Node.js 没有 removeFileSync，使用 unlink
      const fs = require('fs');
      fs.unlinkSync(cachePath);
    } catch {
      // 静默失败
    }
  }
}
