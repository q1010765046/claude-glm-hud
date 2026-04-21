# statusLine 内嵌 API 刷新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去掉 daemon 后台进程，改为 statusLine 自己直接调 API，实现约 30 秒刷新间隔。

**Architecture:** statusLine 每次被 Claude Code 触发时读取缓存文件，判断是否超过 30 秒。过期时直接调 API（阻塞 1-2 秒），使用 fetchingSince 时间戳防雷群。无后台进程。

**Tech Stack:** TypeScript, Node.js https, esbuild

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| MODIFY | `src/types.ts` | CacheFile 新增 `fetchingSince` 字段 |
| MODIFY | `src/constants.ts` | 移除 daemon 常量，新增刷新常量 |
| REWRITE | `src/cache.ts` | 新增 readRawCache/shouldRefresh/acquireFetchLock/releaseFetchLock，简化 readCache |
| REWRITE | `src/index.ts` | 移除 daemon 逻辑，新增内嵌 API 刷新 |
| DELETE | `src/daemon.ts` | 守护进程工作循环（不再需要） |
| DELETE | `src/daemon-manager.ts` | 守护进程生命周期管理（不再需要） |
| UNCHANGED | `src/stdin.ts` | stdin 解析不变 |
| UNCHANGED | `src/http-agent.ts` | HTTP 连接复用不变 |
| UNCHANGED | `src/config.ts` | 配置管理不变 |
| UNCHANGED | `src/glm-api.ts` | GLM API 不变（`fetchGlmApi` 导出保留） |
| UNCHANGED | `src/minimax-api.ts` | MiniMax API 不变（`fetchMiniMaxApi` 导出保留） |
| UNCHANGED | `src/render/*` | 渲染层不变 |

---

### Task 1: 更新类型定义和常量

**Files:**
- Modify: `src/types.ts:44-49`（CacheFile 接口）
- Modify: `src/constants.ts`（全文件重写）

- [ ] **Step 1: 修改 `src/types.ts`，CacheFile 新增 `fetchingSince` 字段**

在 `tokenFingerprint` 后面新增一行：

```typescript
export interface CacheFile {
  provider?: 'glm' | 'minimax';
  tokenFingerprint?: string;
  fetchingSince?: number;     // fetch 锁时间戳（防雷群）
  data: UsageData;
  timestamp: number;
}
```

- [ ] **Step 2: 重写 `src/constants.ts`**

删除 `DAEMON_PID_FILE`、`HEARTBEAT_FILE`、`DAEMON_INTERVAL_MS`、`HEARTBEAT_TIMEOUT_MS`、`CACHE_TTL_MS`、`CACHE_FAILURE_TTL_MS`。

新增 `REFRESH_INTERVAL_MS` 和 `FETCH_LOCK_TIMEOUT_MS`。

最终内容：

```typescript
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
export const BAR_WIDTH = 20;

// 5小时周期（秒）
export const CYCLE_SECONDS = 18000;

// MiniMax API 配置
export const MINIMAX_API_BASE = 'https://www.minimaxi.com';
export const MINIMAX_USAGE_ENDPOINT = '/v1/api/openplatform/coding_plan/remains';
```

- [ ] **Step 3: 提交**

```bash
rtk git add src/types.ts src/constants.ts
rtk git commit -m "refactor: 更新类型和常量，准备内嵌刷新架构"
```

---

### Task 2: 重构 cache.ts

**Files:**
- Modify: `src/cache.ts`（完全重写）

核心变更：新增 `readRawCache`、`shouldRefresh`、`acquireFetchLock`、`releaseFetchLock`。简化 `readCache`（移除 TTL/宽限期逻辑，刷新决策由 `shouldRefresh` 统一控制）。导出 `getCachePath` 供 index.ts 使用。保留 `writeCache`、`readContextCache`、`writeContextCache` 兼容 glm-api.ts 和 render 层。

- [ ] **Step 1: 完全重写 `src/cache.ts`**

```typescript
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
```

- [ ] **Step 2: 提交**

```bash
rtk git add src/cache.ts
rtk git commit -m "refactor: 重构 cache.ts，新增 readRawCache 和 fetch 锁机制"
```

---

### Task 3: 重写 index.ts

**Files:**
- Modify: `src/index.ts`（完全重写）

- [ ] **Step 1: 完全重写 `src/index.ts`**

移除所有 daemon 相关 import 和逻辑。statusLine 现在自己判断缓存过期时直接调 API。

```typescript
/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息
 *
 * statusLine 模式：读取缓存 + 过期时直接调 API + 渲染输出
 * 无后台进程，通过 fetchingSince 锁机制防止雷群请求
 */

import { readStdin } from './stdin.js';
import { render } from './render/index.js';
import { isMiniMaxModel, getAuthToken } from './config.js';
import {
  readRawCache,
  readCache,
  shouldRefresh,
  acquireFetchLock,
  releaseFetchLock,
  getCachePath,
} from './cache.js';
import { fetchGlmApi } from './glm-api.js';
import { fetchMiniMaxApi } from './minimax-api.js';

/**
 * statusLine 模式：缓存读取 + 按需 API 刷新 + 渲染
 */
async function statusLineMode(): Promise<void> {
  try {
    // 1. 读取 stdin 数据
    const stdin = await readStdin();

    // 2. 判断供应商并读取原始缓存
    const provider = isMiniMaxModel() ? 'minimax' : 'glm';
    const { cache } = readRawCache(provider);

    // 3. 缓存过期时直接调 API 刷新
    if (shouldRefresh(cache)) {
      const authToken = getAuthToken();
      if (authToken) {
        const cachePath = getCachePath();
        acquireFetchLock(cachePath, cache);
        try {
          const data = provider === 'minimax'
            ? await fetchMiniMaxApi(authToken)
            : await fetchGlmApi(authToken);
          if (data) {
            releaseFetchLock(cachePath, data, provider);
          }
        } catch {
          // API 失败不覆盖旧缓存，fetch 锁在 FETCH_LOCK_TIMEOUT_MS 后自动失效
        }
      }
    }

    // 4. 重新读取最新缓存并渲染
    const usageData = readCache(provider);
    render({ stdin, usageData: usageData ?? undefined });
  } catch {
    // 静默处理错误
  }
}

async function main(): Promise<void> {
  await statusLineMode();
}

main().catch(() => {});
```

- [ ] **Step 2: 提交**

```bash
rtk git add src/index.ts
rtk git commit -m "refactor: index.ts 改为内嵌 API 刷新，移除 daemon 依赖"
```

---

### Task 4: 删除 daemon 文件

**Files:**
- Delete: `src/daemon.ts`
- Delete: `src/daemon-manager.ts`

此时 esbuild 入口 `src/index.ts` 已不再引用这两个文件，构建不会受影响。

- [ ] **Step 1: 删除 daemon 文件**

```bash
rm src/daemon.ts src/daemon-manager.ts
```

- [ ] **Step 2: 提交**

```bash
rtk git add -A
rtk git commit -m "refactor: 删除 daemon 和 daemon-manager，零后台进程架构"
```

---

### Task 5: 构建和验证

- [ ] **Step 1: 构建**

```bash
cd D:/myProject/claude-glm-hud && npm run build
```

预期：`[构建成功] dist/index.js`，无错误。

- [ ] **Step 2: 手动验证 statusLine 模式**

用 stdin 模拟 Claude Code 触发，验证渲染输出：

```bash
echo '{"model":{"display_name":"claude-sonnet-4-6"},"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":5000},"used_percentage":2.5}}' | npx tsx src/index.ts
```

预期：输出带上下文窗口信息的渲染结果。首次运行因无缓存会尝试调 API（可能因无有效 token 失败，属正常）。

- [ ] **Step 3: 验证 DEBUG 模式**

```bash
echo '{"model":{"display_name":"claude-sonnet-4-6"},"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":5000},"used_percentage":2.5}}' | DEBUG=1 npx tsx src/index.ts
```

预期：stderr 显示调试日志（缓存读取、API 调用等），stdout 显示渲染结果。

- [ ] **Step 4: 更新版本号并提交**

在 `package.json` 中将 `version` 改为 `"1.2.0"`，然后：

```bash
rtk git add package.json
rtk git commit -m "feat: v1.2.0 - statusLine 内嵌 API 刷新，去 daemon 架构"
```

- [ ] **Step 5: 更新 CLAUDE.md 架构描述**

将 `CLAUDE.md` 中的架构描述更新为新的内嵌刷新架构（移除 daemon 相关描述）。
