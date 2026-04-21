# statusLine 内嵌 API 刷新方案

## 背景

当前 daemon + 文件缓存架构存在以下问题：
- daemon 后台进程在 Windows 上不稳定，PID/心跳管理脆弱
- 缓存刷新不及时，用户感知延迟大
- 跨进程协作（PID 文件、心跳文件、缓存文件）增加了故障点

## 目标

- 去掉 daemon 后台进程，statusLine 自己直接调 API
- 实现约 30 秒刷新间隔
- 架构极简，无后台常驻进程

## 架构变更

### 删除的文件

- `src/daemon.ts` — 守护进程工作循环（整文件删除）
- `src/daemon-manager.ts` — 守护进程生命周期管理（整文件删除）

### 删除的代码

`src/constants.ts` 中移除：
- `DAEMON_PID_FILE`
- `HEARTBEAT_FILE`
- `DAEMON_INTERVAL_MS`
- `HEARTBEAT_TIMEOUT_MS`

`src/index.ts` 中移除：
- `ensureDaemonRunning()` 调用
- `updateHeartbeat()` 调用
- 相关 import

### 修改的文件

#### `src/constants.ts`

新增：
```typescript
export const REFRESH_INTERVAL_MS = 30_000;   // 缓存刷新间隔: 30 秒
export const FETCH_LOCK_TIMEOUT_MS = 10_000;  // fetch 锁超时: 10 秒
```

保留不变：`CACHE_DIR`、`CACHE_FILE`、颜色、进度条、API 端点等。

#### `src/types.ts`

`CacheFile` 新增字段：
```typescript
export interface CacheFile {
  provider?: 'glm' | 'minimax';
  tokenFingerprint?: string;
  fetchingSince?: number;  // 新增：fetch 锁时间戳
  data: UsageData;
  timestamp: number;
}
```

#### `src/cache.ts`

改造 `readCache` 返回值，同时暴露原始缓存供锁机制使用：

```typescript
export function readRawCache(expectedProvider?: 'glm' | 'minimax'): {
  cache: CacheFile | null;
  data: UsageData | null;
} {
  // 读取并解析缓存文件，返回原始 CacheFile 和解析后的 UsageData
  // 用于 shouldRefresh 判断和锁机制
}

// 原有 readCache 保留，内部调用 readRawCache 并只返回 data
export function readCache(expectedProvider?: 'glm' | 'minimax'): UsageData | null
```

新增锁管理函数：

```typescript
export function shouldRefresh(cache: CacheFile | null): boolean {
  if (!cache) return true;
  // fetch 锁未超时，跳过
  if (cache.fetchingSince && Date.now() - cache.fetchingSince < FETCH_LOCK_TIMEOUT_MS) {
    return false;
  }
  // 缓存超过刷新间隔，需要刷新
  return Date.now() - cache.timestamp >= REFRESH_INTERVAL_MS;
}

export function acquireFetchLock(cachePath: string, existingCache: CacheFile | null): void {
  // 首次运行（无缓存）时构造空壳缓存
  const cache: CacheFile = existingCache ?? {
    data: { tokenPercent: 0, apiUnavailable: true, provider: 'glm' },
    timestamp: 0,
  };
  cache.fetchingSince = Date.now();
  writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
}

export function releaseFetchLock(cachePath: string, data: UsageData, provider: string): void {
  const cache: CacheFile = {
    provider,
    tokenFingerprint: getTokenFingerprint() ?? undefined,
    data,
    timestamp: Date.now(),
    // fetchingSince 不写入 = 释放锁
  };
  writeFileSync(cachePath, JSON.stringify(cache), 'utf-8');
}
```

移除宽限期相关逻辑（不再需要，statusLine 自己可以调 API 补救）。

#### `src/index.ts`

新流程：

```typescript
async function statusLineMode(): Promise<void> {
  try {
    const stdin = await readStdin();
    const provider = isMiniMaxModel() ? 'minimax' : 'glm';

    // 读取原始缓存（包含锁信息）
    const { cache } = readRawCache(provider);

    // 判断是否需要刷新
    if (shouldRefresh(cache)) {
      const authToken = getAuthToken();
      if (authToken) {
        acquireFetchLock(getCachePath(), cache);
        try {
          const data = provider === 'minimax'
            ? await fetchMiniMaxApi(authToken)
            : await fetchGlmApi(authToken);
          if (data) {
            releaseFetchLock(getCachePath(), data, provider);
          }
        } catch {
          // API 失败不覆盖旧缓存
        }
      }
    }

    // 重新读取最新缓存渲染
    const usageData = readCache(provider);
    render({ stdin, usageData: usageData ?? undefined });
  } catch {
    // 静默处理
  }
}
```

### 不变的文件

- `src/stdin.ts` — stdin 解析不变
- `src/http-agent.ts` — HTTP 连接复用和重试逻辑不变
- `src/config.ts` — 配置管理不变
- `src/glm-api.ts` — GLM API 调用不变（`fetchGlmApi` 导出保留）
- `src/minimax-api.ts` — MiniMax API 调用不变（`fetchMiniMaxApi` 导出保留）
- `src/render/index.ts` — 渲染逻辑不变
- `src/render/utils.ts` — 工具函数不变

## 数据流

```
Claude Code 触发 statusLine（每 ~300ms）
    ↓
新进程启动
    ↓
1. readStdin()                    ← 读 stdin JSON
2. readRawCache(provider)         ← 读原始缓存（含锁信息）
3. shouldRefresh(cache)?          ← 判断是否 >30s 且无活跃锁
   ├── 否 → 跳过，用缓存数据
   └── 是 → acquireFetchLock()    ← 写锁（防雷群）
           → fetchGlmApi / fetchMiniMaxApi  ← 直连 API（~1-2s）
           → releaseFetchLock()   ← 写新缓存（释放锁）
4. readCache(provider)            ← 重新读取最新缓存
5. render()                       ← 渲染输出
    ↓
进程退出（无任何残留）
```

## 防雷群机制

当缓存过期时，多个 statusLine 进程可能同时触发：

1. 进程 A 读到过期缓存，写入 `fetchingSince` 时间戳，开始调 API
2. 进程 B/C/D 读到同一缓存，看到 `fetchingSince` 未超时（<10s），跳过 API 调用
3. 进程 A 完成 API 调用，写入新缓存（无 `fetchingSince`）
4. 后续进程读到新鲜缓存，正常渲染

## 错误处理

| 场景 | 行为 |
|------|------|
| API 调用失败 | 不覆盖旧缓存，用旧数据渲染 |
| 无缓存且 API 失败 | 渲染但不显示 token 信息（仅上下文窗口） |
| fetch 锁超时（>10s） | 视为锁已失效，允许新进程重新获取 |
| 缓存文件损坏 | 优雅降级，当作无缓存处理 |

## 刷新频率分析

- Claude Code 触发间隔：~300ms
- API 调用频率：最坏情况每 30 秒 1-2 次（雷群保护生效后）
- 阻塞频率：每 30 秒有一次 statusLine 调用会阻塞 ~1-2 秒
- Claude Code 超时：3 秒（stdin timeout），API 调用在安全范围内
