# GLM-HUD 项目指南

## 项目概述

GLM-HUD 是一个 Claude Code 状态栏插件，实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息。

## 架构

```
src/
├── index.ts           # 主入口（statusLine 内嵌 API 刷新）
├── types.ts           # 类型定义（StdinData, UsageData, CacheFile 等）
├── constants.ts       # 常量（API 端点、刷新间隔、颜色）
├── stdin.ts           # stdin JSON 解析（带 3 秒超时保护）
├── config.ts          # 配置管理（读取 settings.json，进程内缓存）
├── http-agent.ts      # HTTP 连接复用（keepAlive）+ 公共重试逻辑
├── glm-api.ts         # 智谱 AI API 集成
├── minimax-api.ts     # MiniMax API 集成
├── cache.ts           # 文件缓存 + fetch 锁机制（防雷群）
└── render/            # 渲染模块
    ├── index.ts       # 渲染协调器
    └── utils.ts       # 工具函数（进度条、时间格式化、Token 格式化）
```

## 数据流

```
Claude Code (每 ~300ms)
    ↓ stdin JSON
├── model.display_name
├── context_window
│   ├── context_window_size
│   ├── current_usage.input_tokens
│   └── used_percentage
└── cwd
    ↓
src/index.ts (statusLine 模式)
    ↓
1. readStdin()           → 读取 stdin 数据
2. readRawCache()        → 读取原始缓存（含锁信息）
3. shouldRefresh(cache)? → 判断是否超过 30 秒
   ├── 是 → acquireFetchLock() → fetchGlmApi/fetchMiniMaxApi → releaseFetchLock()
   └── 否 → 跳过
4. readCache()           → 读取最新缓存
5. render()              → 渲染输出到 stdout
    ↓
stdout (状态栏显示)
进程立即退出（无后台常驻）
```

## 核心功能

### 内嵌刷新架构

- **无后台进程**：statusLine 每次被触发时自行判断缓存是否过期
- **直接调 API**：缓存超过 30 秒时，statusLine 直接请求智谱/MiniMax API
- **fetch 锁防雷群**：通过 `fetchingSince` 时间戳防止多个 statusLine 进程同时调 API
- **锁超时保护**：fetch 锁 10 秒后自动失效，不会永久卡住

### 跨进程缓存

- 文件缓存路径：`~/.claude/plugins/claude-glm-hud/glm-usage-cache.json`
- 刷新间隔：30 秒（`REFRESH_INTERVAL_MS`）
- fetch 锁超时：10 秒（`FETCH_LOCK_TIMEOUT_MS`）
- provider 校验：切换智谱/MiniMax 时自动失效旧缓存
- Token 指纹校验：切换账号时缓存自动失效
- 上下文缓存：10 秒 TTL，应对思考阶段数据清零

### 多供应商支持

- 智谱 AI（GLM）：5 小时/周限额、MCP 使用率
- MiniMax：Token 使用率、语音、图像使用率
- 通过 `settings.json` 中的 `ANTHROPIC_MODEL` 自动识别

### HTTP 连接管理

- keepAlive Agent 复用 TLS 连接，减少握手开销
- 指数退避重试（1s → 2s → 4s），应对网络不稳定
- 统一 `withRetry()` 封装，避免重试逻辑重复

## 开发指南

### 调试

设置环境变量启用调试日志：
```bash
DEBUG=1 npm run dev
```

### 添加新的渲染行

1. 在 `src/render/` 创建新文件
2. 实现 `renderXxxLine(ctx: RenderContext): string | null` 函数
3. 在 `src/render/index.ts` 中导入并调用

### 修改 API 端点

编辑 `src/constants.ts`：
```typescript
export const GLM_API_BASE = 'https://api.z.ai';
export const GLM_USAGE_ENDPOINT = '/api/monitor/usage/quota/limit';
```

## 安装方式

面向用户时，优先引导其在 Claude Code 中执行：

```text
@自动安装.md
```

该文档负责安装依赖、构建插件并配置 `statusLine`。

## 常见问题

### 状态栏不显示

检查 `~/.claude/settings.json` 中的 statusLine 配置

### 上下文数据不更新

确保使用 Claude Code v2.1.6+，该版本支持 context_window 数据

### GLM API 调用失败

检查 `~/.claude/settings.json` 中的 `ANTHROPIC_AUTH_TOKEN` 配置
