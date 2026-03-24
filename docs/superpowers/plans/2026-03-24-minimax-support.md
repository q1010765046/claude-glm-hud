# MiniMax 套餐支持实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 GLM-HUD 插件新增 MiniMax 套餐支持，通过 ANTHROPIC_MODEL 字段自动识别并显示对应的使用率信息。

**Architecture:** 通过 settings.json 中的 ANTHROPIC_MODEL 字段判断当前使用的 API（glm-* 或 MiniMax-*），调用对应的 API 获取使用率数据，统一转换为 UsageData 结构后渲染。MiniMax 模式下显示"语音"、"图像"标签代替" MCP"、"上下文"。

**Tech Stack:** TypeScript, Node.js, fetch API

**Spec:** `docs/superpowers/specs/2026-03-24-minimax-support-design.md`

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/constants.ts` | 修改 | 新增 MiniMax API 端点常量 |
| `src/config.ts` | 修改 | 新增模型检测函数 |
| `src/types.ts` | 修改 | 新增 provider 字段，重命名为 UsageData |
| `src/cache.ts` | 修改 | 支持 provider 区分缓存 |
| `src/minimax-api.ts` | 新增 | MiniMax API 调用与数据转换 |
| `src/glm-api.ts` | 修改 | 返回数据增加 provider 字段 |
| `src/index.ts` | 修改 | 根据模型选择 API |
| `src/render/index.ts` | 修改 | 根据 provider 显示不同标签 |

---

## Task 1: 更新常量定义

**Files:**
- Modify: `src/constants.ts`

- [ ] **Step 1: 添加 MiniMax API 端点常量**

在 `src/constants.ts` 文件末尾添加：

```typescript
// MiniMax API 配置
export const MINIMAX_API_BASE = 'https://www.minimaxi.com';
export const MINIMAX_USAGE_ENDPOINT = '/v1/api/openplatform/coding_plan/remains';
```

- [ ] **Step 2: 验证修改**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交**

```bash
git add src/constants.ts
git commit -m "feat: 添加 MiniMax API 端点常量"
```

---

## Task 2: 更新类型定义

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: 重命名类型并添加 provider 字段**

将 `src/types.ts` 中的 `GlmUsageData` 重命名为 `UsageData`，并添加 `provider` 字段：

```typescript
/**
 * 统一使用率数据（支持智谱和 MiniMax）
 */
export interface UsageData {
  tokenPercent: number;
  mcpPercent?: number;
  contextPercent?: number;  // MiniMax: 图像使用率
  resetTime?: number; // 毫秒时间戳
  resetSeconds?: number;
  apiUnavailable?: boolean;
  provider?: 'glm' | 'minimax';  // 数据来源，用于渲染层判断标签
}

// 保持向后兼容的类型别名
export type GlmUsageData = UsageData;
```

同时更新 `CacheFile` 接口：

```typescript
/**
 * 缓存文件结构
 */
export interface CacheFile {
  provider?: 'glm' | 'minimax';  // 新增：区分数据来源
  data: UsageData;
  timestamp: number;
}
```

更新 `RenderContext` 接口：

```typescript
/**
 * 渲染上下文
 */
export interface RenderContext {
  stdin: StdinData;
  usageData?: UsageData;  // 重命名
}
```

- [ ] **Step 2: 验证修改**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功（可能有类型错误，后续任务会修复）

- [ ] **Step 3: 提交**

```bash
git add src/types.ts
git commit -m "refactor: 重命名 GlmUsageData 为 UsageData，添加 provider 字段"
```

---

## Task 3: 添加模型检测函数

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: 添加 getAnthropicModel 和 isMiniMaxModel 函数**

在 `src/config.ts` 中添加：

```typescript
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
```

- [ ] **Step 2: 验证修改**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/config.ts
git commit -m "feat: 添加 getAnthropicModel 和 isMiniMaxModel 函数"
```

---

## Task 4: 更新缓存模块支持 provider

**Files:**
- Modify: `src/cache.ts`

- [ ] **Step 1: 更新导入和类型**

修改 `src/cache.ts` 顶部的导入：

```typescript
import { CacheFile, UsageData } from './types.js';
```

- [ ] **Step 2: 更新 readCache 函数签名和逻辑**

修改 `readCache` 函数，增加 provider 参数用于验证缓存有效性：

```typescript
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
```

- [ ] **Step 3: 更新 writeCache 函数签名**

修改 `writeCache` 函数，增加 provider 参数：

```typescript
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
```

- [ ] **Step 4: 验证修改**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功

- [ ] **Step 5: 提交**

```bash
git add src/cache.ts
git commit -m "feat: 缓存模块支持 provider 区分"
```

---

## Task 5: 更新智谱 API 模块

**Files:**
- Modify: `src/glm-api.ts`

- [ ] **Step 1: 更新导入和类型**

修改 `src/glm-api.ts` 顶部的导入：

```typescript
import { UsageData } from './types.js';
```

- [ ] **Step 2: 更新 parseApiResponse 函数**

在 `parseApiResponse` 函数中添加 `provider: 'glm'`：

```typescript
function parseApiResponse(data: GlmApiResponse): UsageData | null {
  try {
    const result: UsageData = {
      tokenPercent: 0,
      mcpPercent: undefined,
      resetTime: undefined,
      apiUnavailable: false,
      provider: 'glm',  // 添加这行
    };
    // ... 其余代码保持不变
  }
}
```

- [ ] **Step 3: 更新 getGlmUsage 函数签名**

修改 `getGlmUsage` 函数返回类型和缓存调用：

```typescript
export async function getGlmUsage(): Promise<UsageData | undefined> {
  // 先尝试读取缓存
  const cached = readCache('glm');  // 指定 provider
  if (cached) {
    return cached;
  }
  // ... 其余代码保持不变

  if (data) {
    // 写入缓存，指定 provider
    writeCache(data, 'glm');
    return data;
  }

  // API 调用失败，返回失败标记
  const failureData: UsageData = {
    tokenPercent: 0,
    apiUnavailable: true,
    provider: 'glm',
  };
  writeCache(failureData, 'glm');
  return undefined;
}
```

- [ ] **Step 4: 验证修改**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功

- [ ] **Step 5: 提交**

```bash
git add src/glm-api.ts
git commit -m "refactor: 智谱 API 模块使用统一类型，添加 provider 字段"
```

---

## Task 6: 创建 MiniMax API 模块

**Files:**
- Create: `src/minimax-api.ts`

- [ ] **Step 1: 创建 minimax-api.ts 文件**

创建 `src/minimax-api.ts`：

```typescript
/**
 * MiniMax API 集成
 * 调用 MiniMax API 获取套餐余量
 */

import { getAuthToken } from './config.js';
import { readCache, writeCache } from './cache.js';
import { UsageData } from './types.js';
import { MINIMAX_API_BASE, MINIMAX_USAGE_ENDPOINT } from './constants.js';

/**
 * MiniMax API 响应类型
 */
interface MiniMaxApiResponse {
  model_remains?: Array<{
    model_name: string;
    current_interval_total_count: number;
    current_interval_usage_count: number;
    remains_time?: number;
  }>;
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

/**
 * 从 model_remains 数组中查找指定模型
 */
function findModel(data: MiniMaxApiResponse, modelPrefix: string) {
  return data.model_remains?.find(m =>
    m.model_name.toLowerCase().startsWith(modelPrefix.toLowerCase())
  );
}

/**
 * 计算使用百分比
 */
function calculatePercent(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * 解析 API 响应为统一数据结构
 */
function parseApiResponse(data: MiniMaxApiResponse): UsageData | null {
  try {
    if (data.base_resp?.status_code !== 0) {
      return null;
    }

    // 查找各个模型的数据
    const tokenModel = findModel(data, 'MiniMax-M');
    const speechModel = findModel(data, 'speech-hd');
    const imageModel = findModel(data, 'image-01');

    // 必须有主模型数据
    if (!tokenModel) {
      return null;
    }

    const result: UsageData = {
      tokenPercent: calculatePercent(
        tokenModel.current_interval_usage_count,
        tokenModel.current_interval_total_count
      ),
      provider: 'minimax',
    };

    // 剩余时间（毫秒）
    if (tokenModel.remains_time) {
      result.resetTime = Date.now() + tokenModel.remains_time;
      result.resetSeconds = Math.floor(tokenModel.remains_time / 1000);
    }

    // 语音使用率
    if (speechModel && speechModel.current_interval_total_count > 0) {
      result.mcpPercent = calculatePercent(
        speechModel.current_interval_usage_count,
        speechModel.current_interval_total_count
      );
    }

    // 图像使用率
    if (imageModel && imageModel.current_interval_total_count > 0) {
      result.contextPercent = calculatePercent(
        imageModel.current_interval_usage_count,
        imageModel.current_interval_total_count
      );
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * 调用 MiniMax API
 */
async function fetchMiniMaxApi(authToken: string): Promise<UsageData | null> {
  const url = `${MINIMAX_API_BASE}${MINIMAX_USAGE_ENDPOINT}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5秒超时
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MiniMaxApiResponse;
    return parseApiResponse(data);
  } catch {
    return null;
  }
}

/**
 * 获取 MiniMax 使用率数据（带缓存）
 */
export async function getMiniMaxUsage(): Promise<UsageData | undefined> {
  // 先尝试读取缓存
  const cached = readCache('minimax');
  if (cached) {
    return cached;
  }

  // 获取 AUTH_TOKEN
  const authToken = getAuthToken();
  if (!authToken) {
    return undefined;
  }

  // 调用 API
  const data = await fetchMiniMaxApi(authToken);

  if (data) {
    writeCache(data, 'minimax');
    return data;
  }

  // API 调用失败，返回失败标记
  const failureData: UsageData = {
    tokenPercent: 0,
    apiUnavailable: true,
    provider: 'minimax',
  };
  writeCache(failureData, 'minimax');
  return undefined;
}
```

- [ ] **Step 2: 验证编译**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/minimax-api.ts
git commit -m "feat: 新增 MiniMax API 模块"
```

---

## Task 7: 更新主入口文件

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: 更新导入和主函数**

修改 `src/index.ts`：

```typescript
/**
 * GLM-HUD 插件主入口
 * 实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息
 */

import { readStdin } from './stdin.js';
import { getGlmUsage } from './glm-api.js';
import { getMiniMaxUsage } from './minimax-api.js';
import { render } from './render/index.js';
import { isMiniMaxModel } from './config.js';

/**
 * 主函数
 */
export async function main(): Promise<void> {
  try {
    // 1. 读取 stdin 数据
    const stdin = await readStdin();

    // 2. 根据模型选择 API 获取使用率数据
    const usageData = isMiniMaxModel()
      ? await getMiniMaxUsage()
      : await getGlmUsage();

    // 3. 渲染输出
    render({ stdin, usageData });
  } catch (error) {
    // 静默处理错误
  }
}

// 直接执行（用于调试）
main().catch(() => {});
```

- [ ] **Step 2: 验证编译**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/index.ts
git commit -m "feat: 主入口支持根据模型自动选择 API"
```

---

## Task 8: 更新渲染模块

**Files:**
- Modify: `src/render/index.ts`

- [ ] **Step 1: 更新渲染函数参数类型**

修改 `src/render/index.ts` 中的 `render` 函数：

```typescript
/**
 * 渲染输出（老版本格式 + 上下文）
 */
export function render(ctx: RenderContext): void {
  const { stdin, usageData } = ctx;  // 重命名 glmUsage -> usageData

  const parts: string[] = [];
  const isMiniMax = usageData?.provider === 'minimax';

  // 1. Token 进度条
  if (usageData && usageData.tokenPercent !== null) {
    const tokenStr = `🔋Token:${formatProgressBar(usageData.tokenPercent)} ${usageData.tokenPercent.toString().padStart(3)}%`;
    parts.push(tokenStr);
  }

  // 2. 剩余时间进度条
  if (usageData && usageData.resetTime) {
    const resetInfo = formatResetTime(usageData.resetTime);
    if (resetInfo) {
      const resetStr = `🔄剩余:${formatProgressBar(resetInfo.percent)} ${resetInfo.text}`;
      parts.push(resetStr);
    }
  }

  // 3. MCP/语音 进度条
  if (usageData && usageData.mcpPercent !== undefined) {
    const label = isMiniMax ? '语音' : 'MCP';
    const mcpStr = `🌐${label}:${formatProgressBar(usageData.mcpPercent)} ${usageData.mcpPercent.toString().padStart(3)}%`;
    parts.push(mcpStr);
  }

  // 4. 上下文/图像 进度条
  if (isMiniMax && usageData?.contextPercent !== undefined) {
    // MiniMax 模式：显示图像使用率
    const imageStr = `📊图像:${formatProgressBar(usageData.contextPercent)} ${usageData.contextPercent.toString().padStart(3)}%`;
    parts.push(imageStr);
  } else {
    // 智谱模式：显示上下文窗口
    const contextInfo = renderContextInfo(stdin);
    if (contextInfo) {
      parts.push(contextInfo);
    }
  }

  // 组合内容（老版本格式：用 │ 分隔）
  if (parts.length > 0) {
    const content = parts.join(' │ ');
    console.log(content);
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/render/index.ts
git commit -m "feat: 渲染模块支持 MiniMax 模式的不同标签"
```

---

## Task 9: 最终构建和测试

**Files:**
- 无文件修改，仅验证

- [ ] **Step 1: 完整构建**

Run: `cd "D:/MyProject/claude-glm-hud" && npm run build`
Expected: 编译成功，无错误

- [ ] **Step 2: 手动测试 - 智谱模式**

确保 settings.json 中 `ANTHROPIC_MODEL` 设置为 `glm-*` 格式，运行：

```bash
cd "D:/MyProject/claude-glm-hud"
echo '{"model":{"display_name":"test"}}' | node dist/index.js
```

Expected: 显示智谱模式（MCP、上下文标签）

- [ ] **Step 3: 手动测试 - MiniMax 模式**

确保 settings.json 中 `ANTHROPIC_MODEL` 设置为 `MiniMax-*` 格式，运行：

```bash
cd "D:/MyProject/claude-glm-hud"
echo '{"model":{"display_name":"test"}}' | node dist/index.js
```

Expected: 显示 MiniMax 模式（语音、图像标签）

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 完成 MiniMax 套餐支持"
```

---

## 验收标准

1. **智谱模式**：当 `ANTHROPIC_MODEL` 包含 `glm-` 时，显示智谱 API 数据，标签为 MCP、上下文
2. **MiniMax 模式**：当 `ANTHROPIC_MODEL` 包含 `MiniMax-` 时，显示 MiniMax API 数据，标签为语音、图像
3. **缓存隔离**：切换 API 后，缓存自动失效
4. **错误处理**：API 调用失败时不崩溃，优雅降级
5. **构建成功**：`npm run build` 无错误
