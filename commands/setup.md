---
description: 配置 GLM-HUD 为 Claude Code 状态栏插件
allowed-tools: Read, Edit, AskUserQuestion, Bash
---

# GLM-HUD 插件安装

欢迎使用 GLM-HUD 插件！此命令将自动配置状态栏。

## 检查前置条件

首先检查是否已配置智谱 AI 的 API Token：

请确保您的 `~/.claude/settings.json` 中包含以下配置：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "您的智谱AI_API_Token"
  }
}
```

## 配置状态栏

我将为您配置 `~/.claude/settings.json`，添加以下内容：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/claude-glm-hud/dist/index.js"
  }
}
```

是否继续配置？

配置完成后，请重启 Claude Code 使更改生效。
