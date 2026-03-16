# GLM-HUD 快速开始

## 项目结构

```
claude-glm-hud/
├── commands/                # 用户命令
│   ├── setup.md           # 安装命令
│   └── configure.md       # 配置命令（保留用于未来扩展）
├── src/                     # 源代码
│   ├── index.ts           # 主入口
│   ├── types.ts           # 类型定义
│   ├── constants.ts       # 常量
│   ├── stdin.ts           # stdin 解析
│   ├── config.ts          # 配置管理（AUTH_TOKEN）
│   ├── glm-api.ts         # GLM API
│   ├── cache.ts           # 缓存管理
│   └── render/            # 渲染模块
│       ├── index.ts       # 渲染协调器
│       └── utils.ts       # 工具函数
├── dist/                    # 构建输出
├── package.json
├── tsconfig.json
├── build.ts
├── README.md
├── CLAUDE.md
└── QUICKSTART.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 本地测试

```bash
# 测试渲染功能
echo '{"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":90000},"used_percentage":45}}' | node dist/index.js

# 预期输出：
# 📊上下文:[███████████████░░░░░░░░░] 45% (90K/200K)
```

### 4. 配置状态栏

编辑 `~/.claude/settings.json`：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node D:/myProject/claude-glm-hud/dist/index.js"
  },
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "你的智谱AI_Token"
  }
}
```

### 5. 重启 Claude Code

## 开发模式

```bash
# 监听模式（自动重新编译）
npm run watch
```

## 显示效果

插件会在状态栏显示以下信息（用 │ 分隔）：

- **🔋Token** - 智谱 AI Token 使用率
- **🔄剩余** - 剩余时间进度
- **🌐MCP** - MCP 时间使用率
- **📊上下文** - 当前会话上下文窗口使用情况

## 发布流程

1. 更新 `package.json` 中的版本号
2. 运行 `npm run build`
3. 提交到 Git
4. 创建 Git Tag
5. 运行 `claude marketplace publish`
