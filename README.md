# GLM-HUD

> Claude Code 状态栏插件：实时显示智谱 AI Token 使用率和上下文窗口信息

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

- 📊 **上下文窗口显示** - 实时显示当前会话的上下文使用情况
- 🔋 **Token 使用率** - 显示智谱 AI 的 Token 使用配额
- 🌐 **MCP 使用率** - 显示 MCP 服务器的时间使用率
- 🎨 **彩色进度条** - 直观的进度条可视化
- ⚙️ **可配置** - 支持多种布局模式和显示选项

## 显示效果

### Compact 模式（单行）

```
📊[██████░░░░] 45% (90K/200K) │ 🔋[░░░░░░░░░░] 3% │ 🌐[██████░░░░] 65%
```

### Expanded 模式（多行）

```
📊上下文:[██████░░░░] 45% (90K/200K)
🔋Token:[░░░░░░░░░░] 3%
🌐MCP:[██████░░░░] 65%
```

## 安装

### 从 Marketplace 安装（推荐）

在 Claude Code 中执行：

```
/marketplace
搜索 "claude-glm-hud"
点击 Install
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

## 配置

配置文件位于：`~/.claude/claude-glm-hud.json`

### 示例配置

```json
{
  "lineLayout": "compact",
  "showSeparators": false,
  "display": {
    "showModel": true,
    "showContext": true,
    "showContextBar": true,
    "showTokenBreakdown": true,
    "showUsage": true,
    "showMcp": true,
    "showDuration": false
  },
  "colors": {
    "low": "green",
    "medium": "yellow",
    "high": "red"
  }
}
```

### 配置选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `lineLayout` | `'compact' \| 'expanded'` | 布局模式 |
| `showSeparators` | `boolean` | 是否显示分隔符 |
| `display.showContext` | `boolean` | 显示上下文窗口 |
| `display.showContextBar` | `boolean` | 显示上下文进度条 |
| `display.showTokenBreakdown` | `boolean` | 显示 Token 数量详情 |
| `display.showUsage` | `boolean` | 显示 Token 使用率 |
| `display.showMcp` | `boolean` | 显示 MCP 使用率 |

## 命令

插件提供以下命令：

- `/claude-glm-hud:setup` - 自动配置状态栏
- `/claude-glm-hud:configure` - 修改显示选项

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

## 许可证

[MIT](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [claude-hud-glm](https://github.com/Siiichenggg/claude-hud-glm) - 参考项目
