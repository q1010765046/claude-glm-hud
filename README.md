# CLAUDE-GLM-HUD

> Claude Code 状态栏插件：实时显示智谱 AI / MiniMax Token 使用率和上下文窗口信息
> 完全使用 ClaudeCode + GLM-4.7 生产的工具

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- **双 API 支持** - 自动识别智谱 AI 或 MiniMax，显示对应使用率
- **Token 使用率** - 显示 5 小时和周 Token 使用配额
- **剩余时间** - 显示 5 小时和周套餐刷新倒计时
- **MCP/语音/图像** - 智谱模式显示 MCP 和上下文，MiniMax 模式显示语音和图像
- **彩色进度条** - 双行对齐布局，直观的薄荷绿进度条可视化
- **智能缓存** - 30 秒刷新间隔，fetch 锁防雷群请求
- **Token 指纹** - 切换 API 账号时自动失效旧缓存
- **连接复用** - keepAlive 复用 TLS 连接，降低握手开销
- **内嵌刷新** - statusLine 直接调 API，无后台进程

## 显示效果

### 智谱模式（ANTHROPIC_MODEL 包含 glm）

```
🔋5h:[█████████████░░░░░░░░░░░]  53% │ 🔄5h:[████████████████░░░░░░░]   1h1m │ 🌐MCP:[░░░░░░░░░░░░░░░░░░░░░░░]   4%
🔋周:[██████░░░░░░░░░░░░░░░░░░]  25% │ 🔄周:[██████░░░░░░░░░░░░░░░░░░]   5d3h │ 📊CTX:[█████████████░░░░░░░░░░░]  52%
```

### MiniMax 模式（ANTHROPIC_MODEL 包含 minimax）

```
🔋5h:[████████████████░░░░░░░░]  65% │ 🔄5h:[██████████░░░░░░░░░░░░░░]   1h50m │ 🌐语音:[█████░░░░░░░░░░░░░░░░░░░]  15%
🔋周:[█████████████████░░░░░░░]  70% │ 🔄周:[████░░░░░░░░░░░░░░░░░░░░]   3d12h │ 📊图像:[████████████░░░░░░░░░░░░]  45%
```

## 安装

### 快速安装

1. **下载项目**：从 GitHub 下载代码
   ```bash
   git clone https://github.com/q1010765046/claude-glm-hud.git
   cd claude-glm-hud
   ```

2. **执行自动安装**：

   在 Claude Code 中执行：
   ```
   @自动安装.md
   ```

   或手动运行脚本：
   ```bash
   # Windows
   install.bat

   # Linux/macOS
   chmod +x install.sh && ./install.sh
   ```

### 安装说明

- 安装脚本会自动完成构建、复制文件、配置状态栏
- **安装后当前目录可删除**，插件已复制到 `~/.claude/plugins/claude-glm-hud/`

## 配置 API Token

插件需要 API Token 才能显示使用率信息。请在 `~/.claude/settings.json` 中配置：

### 智谱 AI

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "您的智谱AI_API_Token",
    "ANTHROPIC_MODEL": "glm-5"
  }
}
```

### MiniMax

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "您的MiniMax_API_Key",
    "ANTHROPIC_MODEL": "MiniMax-Text-01"
  }
}
```

**自动识别规则：**
- `ANTHROPIC_MODEL` 包含 `glm` → 智谱模式
- `ANTHROPIC_MODEL` 包含 `minimax` → MiniMax 模式

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（监听变化）
npm run watch

# 调试模式（启用详细日志）
DEBUG=1 npm run dev
```

## 技术栈

- TypeScript
- Node.js 18+
- esbuild

## 架构说明

```
src/
├── index.ts           # 主入口（statusLine 内嵌 API 刷新）
├── types.ts           # 类型定义（StdinData, UsageData, CacheFile 等）
├── constants.ts       # 常量（API 端点、刷新间隔、颜色）
├── stdin.ts           # stdin JSON 解析（带超时保护）
├── config.ts          # 配置管理（读取 settings.json，进程内缓存）
├── http-agent.ts      # HTTP 连接复用（keepAlive）+ 公共重试逻辑
├── glm-api.ts         # 智谱 AI API 集成
├── minimax-api.ts     # MiniMax API 集成
├── cache.ts           # 文件缓存 + fetch 锁机制（防雷群）
└── render/            # 渲染模块
    ├── index.ts       # 渲染协调器
    └── utils.ts       # 工具函数（进度条、时间格式化、Token 格式化）
```

## 常见问题

### 状态栏不显示

重新执行 `@自动安装.md`，确认 `~/.claude/settings.json` 中的 `statusLine` 配置已正确写入。

### 上下文数据不更新

确保使用 Claude Code v2.1.6+，该版本支持 context_window 数据。

### API 调用失败

检查 `~/.claude/settings.json` 中的 `ANTHROPIC_AUTH_TOKEN` 配置是否正确。

### 切换 API 后显示旧数据

切换供应商或 API Token 后，缓存会通过 provider 校验和 Token 指纹自动失效。如仍未更新，等待 30 秒缓存过期后自动刷新，或手动删除：
```bash
rm ~/.claude/plugins/claude-glm-hud/glm-usage-cache.json
```

## 许可证

MIT
