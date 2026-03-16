# GLM-HUD

> Claude Code 状态栏插件：实时显示智谱 AI Token 使用率和上下文窗口信息

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- **上下文窗口显示** - 实时显示当前会话的上下文使用情况
- **Token 使用率** - 显示智谱 AI 的 Token 使用配额
- **MCP 使用率** - 显示 MCP 服务器的时间使用率
- **彩色进度条** - 直观的薄荷绿进度条可视化
- **智能缓存** - 上下文数据缓存，思考过程显示更稳定

## 显示效果

```
🔋Token:[██████████░░░░░░░░░░] 50% │ 🔄剩余:[████████████████░░] 80% 3小时32分 │ 🌐MCP:[██████░░░░░░░░░░░░] 30% │ 📊上下文:[███████████████░░░░░░░░░] 45% (90K/200K)
```

## 安装

### 一键安装（推荐）

#### Windows
```bash
# 在 PowerShell 或 CMD 中执行
curl -o install.bat https://raw.githubusercontent.com/q1010765046/claude-glm-hud/main/install.bat
./install.bat
```

#### Linux/macOS
```bash
# 在终端中执行
curl -o install.sh https://raw.githubusercontent.com/q1010765046/claude-glm-hud/main/install.sh
chmod +x install.sh
./install.sh
```

### 手动安装

1. 克隆仓库：
```bash
git clone https://github.com/q1010765046/claude-glm-hud.git ~/.claude/plugins/claude-glm-hud
```

2. 安装依赖：
```bash
cd ~/.claude/plugins/claude-glm-hud
npm install
```

3. 构建插件：
```bash
npm run build
```

4. 配置状态栏：
编辑 `~/.claude/settings.json`，添加：
```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/claude-glm-hud/dist/index.js"
  }
}
```

5. 重启 Claude Code

## 前置条件

使用此插件前，请确保您的 `~/.claude/settings.json` 中已配置智谱 AI 的 API Token：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "您的智谱AI_API_Token"
  }
}
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 监听模式
npm run watch
```

## 技术栈

- TypeScript
- Node.js 18+
- esbuild

## 架构说明

```
src/
├── index.ts          # 主入口
├── types.ts          # 类型定义
├── constants.ts      # 常量
├── stdin.ts          # stdin JSON 解析
├── config.ts         # AUTH_TOKEN 配置
├── glm-api.ts        # GLM API 集成
├── cache.ts          # 缓存管理
└── render/           # 渲染模块
    ├── index.ts      # 渲染协调器
    └── utils.ts      # 工具函数
```

## 常见问题

### 状态栏不显示

检查 `~/.claude/settings.json` 中的 statusLine 配置是否正确。

### 上下文数据不更新

确保使用 Claude Code v2.1.6+，该版本支持 context_window 数据。

### GLM API 调用失败

检查 `~/.claude/settings.json` 中的 ANTHROPIC_AUTH_TOKEN 配置是否正确。

## 许可证

MIT
