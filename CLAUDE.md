# GLM-HUD 项目指南

## 项目概述

GLM-HUD 是一个 Claude Code 状态栏插件，实时显示智谱 AI Token 使用率和上下文窗口信息。

## 架构

```
src/
├── index.ts          # 主入口
├── types.ts          # 类型定义
├── constants.ts      # 常量
├── stdin.ts          # stdin JSON 解析
├── config.ts         # 配置管理
├── glm-api.ts        # GLM API 集成
├── cache.ts          # 缓存管理
└── render/           # 渲染模块
    ├── index.ts      # 渲染协调器
    └── utils.ts      # 工具函数
```

## 数据流

```
Claude Code (每 300ms)
    ↓ stdin JSON
├── model.display_name
├── context_window (新增功能)
│   ├── context_window_size
│   ├── current_usage.input_tokens
│   └── used_percentage
└── cwd
    ↓
src/index.ts (主入口)
    ↓
src/glm-api.ts (获取 GLM 使用率)
    ↓
src/render/ (渲染)
    ↓
stdout (状态栏显示)
```

## 核心功能

### 上下文窗口显示

- 从 stdin JSON 直接获取上下文数据
- 支持进度条可视化
- 自动格式化 Token 数量（K/M）
- 颜色阈值：绿色 <70%，黄色 70-85%，红色 >85%

### GLM API 集成

- 调用智谱 AI API 获取 Token 使用配额
- 智能缓存（成功 60s，失败 15s）
- 异步获取，不阻塞渲染

### 配置系统

- JSON 配置文件
- 支持 compact/expanded 布局
- 可配置各个显示选项

## 开发指南

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

### 调试

设置环境变量启用调试：
```bash
DEBUG=1 npm run dev
```

## 安装方式

面向用户时，优先引导其在 Claude Code 中执行：

```text
@一键安装.md
```

该文档负责安装依赖、构建插件并配置 `statusLine`。

## 常见问题

### 状态栏不显示

检查 `~/.claude/settings.json` 中的 statusLine 配置

### 上下文数据不更新

确保使用 Claude Code v2.1.6+，该版本支持 context_window 数据

### GLM API 调用失败

检查 `~/.claude/settings.json` 中的 `ANTHROPIC_AUTH_TOKEN` 配置
