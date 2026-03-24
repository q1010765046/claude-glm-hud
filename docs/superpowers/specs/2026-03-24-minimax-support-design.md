# MiniMax 套餐支持设计文档

## 概述

为 GLM-HUD 插件新增 MiniMax 套餐支持，通过 `ANTHROPIC_MODEL` 字段自动识别当前使用的 API，并显示对应的使用率信息。

## 需求背景

- 原有功能仅支持智谱 AI 套餐显示
- 需要兼容 MiniMax 套餐的使用率显示
- 两套 API 机制并存，根据用户配置自动切换显示

## 技术方案

### API 识别机制

通过 `~/.claude/settings.json` 中的 `ANTHROPIC_MODEL` 字段判断：

- 包含 `glm-`（忽略大小写）→ 智谱 API
- 包含 `minimax-`（忽略大小写）→ MiniMax API
- 其他/未设置 → 默认智谱 API

### API 端点

**智谱 API：**
- 端点：`https://api.z.ai/api/monitor/usage/quota/limit`
- 认证：`Authorization: <token>`

**MiniMax API：**
- 端点：`https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains`
- 认证：`Authorization: Bearer <token>`

### 数据映射

| 显示项 | 智谱数据源 | MiniMax 数据源 |
|--------|-----------|---------------|
| Token 使用率 | `TOKENS_LIMIT.percentage` | `MiniMax-M*.usage/total * 100` |
| 剩余时间 | `nextResetTime` (毫秒时间戳) | `remains_time` (毫秒) |
| MCP/语音 | `TIME_LIMIT.percentage` | `speech-hd.usage/total * 100` |
| 上下文/图像 | stdin.context_window | `image-01.usage/total * 100` |

### 显示差异

**智谱模式：**
```
🔋Token:███░░░ 65% │ 🔄剩余:██░░ 2小时30分 │ 🌐MCP:██░░ 15% │ 📊上下文:█████ 45%
```

**MiniMax 模式：**
```
🔋Token:███░░░ 65% │ 🔄剩余:██░░ 1小时50分 │ 🌐语音:██░░ 15% │ 📊图像:█████ 45%
```

## 文件改动

### 新增文件

#### `src/minimax-api.ts`

MiniMax API 调用模块，负责：
- 调用 MiniMax 套餐余量接口
- 解析 API 响应
- 转换为统一的 `UsageData` 结构

**关键函数：**
```typescript
export async function getMiniMaxUsage(): Promise<UsageData | undefined>
```

**API 响应结构：**
```json
{
  "model_remains": [
    {
      "model_name": "MiniMax-M*",
      "current_interval_total_count": 1500,
      "current_interval_usage_count": 1382,
      "remains_time": 6580250
    },
    {
      "model_name": "speech-hd",
      "current_interval_total_count": 4000,
      "current_interval_usage_count": 4000
    },
    {
      "model_name": "image-01",
      "current_interval_total_count": 50,
      "current_interval_usage_count": 50
    }
  ],
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### 修改文件

#### `src/constants.ts`

新增 MiniMax API 端点常量：
```typescript
export const MINIMAX_API_BASE = 'https://www.minimaxi.com';
export const MINIMAX_USAGE_ENDPOINT = '/v1/api/openplatform/coding_plan/remains';
```

#### `src/config.ts`

新增函数：
```typescript
export function getAnthropicModel(): string | null
export function isMiniMaxModel(): boolean
```

#### `src/types.ts`

修改类型定义：
```typescript
export interface UsageData {
  tokenPercent: number;
  mcpPercent?: number;
  contextPercent?: number;  // 新增
  resetTime?: number;
  resetSeconds?: number;
  apiUnavailable?: boolean;
  provider?: 'glm' | 'minimax';  // 新增，用于渲染层判断标签
}
```

#### `src/cache.ts`

修改缓存结构：
```typescript
export interface CacheFile {
  provider: 'glm' | 'minimax';  // 新增
  data: UsageData;
  timestamp: number;
}
```

#### `src/index.ts`

修改主函数，根据模型选择 API：
```typescript
const usageData = isMiniMaxModel()
  ? await getMiniMaxUsage()
  : await getGlmUsage();
```

#### `src/render/index.ts`

根据 `provider` 字段显示不同标签：
- 智谱：MCP、上下文
- MiniMax：语音、图像

## 缓存策略

- 统一缓存文件 `glm-usage-cache.json`
- 通过 `provider` 字段区分数据来源
- 缓存 TTL：成功 60 秒，失败 15 秒
- 切换 API 时，缓存自动失效（provider 不匹配）

## 错误处理

- API 调用失败返回 `undefined`
- 渲染层优雅降级，不显示失败的数据项
- 缓存失败数据 15 秒，避免频繁请求

## 测试计划

1. 智谱模式下的显示验证
2. MiniMax 模式下的显示验证
3. API 切换后的自动适配
4. 缓存机制验证
5. 错误场景处理
