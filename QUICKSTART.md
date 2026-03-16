# GLM-HUD 快速开始

## 项目结构

```
claude-glm-hud/
├── .claude-plugin/          # 插件元数据
│   ├── plugin.json         # 插件清单
│   └── marketplace.json    # 市场配置
├── commands/                # 用户命令
│   ├── setup.md           # 安装命令
│   └── configure.md       # 配置命令
├── src/                     # 源代码
│   ├── index.ts           # 主入口
│   ├── types.ts           # 类型定义
│   ├── constants.ts       # 常量
│   ├── stdin.ts           # stdin 解析
│   ├── config.ts          # 配置管理
│   ├── glm-api.ts         # GLM API
│   ├── cache.ts           # 缓存
│   └── render/            # 渲染模块
│       ├── index.ts       # 协调器
│       ├── colors.ts      # 颜色
│       ├── utils.ts       # 工具
│       ├── context-line.ts
│       ├── usage-line.ts
│       └── mcp-line.ts
├── dist/                    # 构建输出
├── package.json
├── tsconfig.json
├── build.ts
├── README.md
├── CLAUDE.md
├── PUBLISH_GUIDE.md
└── PUBLISH_CHECKLIST.md
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
# 📊上下文:[██████░░░░] 45% (90K/200K)
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

## 发布流程

详见 `PUBLISH_GUIDE.md`

1. 更新 `package.json` 中的仓库信息
2. 创建 GitHub 仓库
3. 生成 GitHub Token
4. 推送代码和标签
5. 运行 `claude marketplace publish`
