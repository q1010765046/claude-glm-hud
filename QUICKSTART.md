# GLM-HUD 快速开始

## 项目结构

```
claude-glm-hud/
├── commands/                # 用户命令
│   └── setup.md           # 安装命令
├── src/                     # 源代码
│   ├── index.ts           # 主入口
│   ├── types.ts           # 类型定义
│   ├── constants.ts       # 常量
│   ├── stdin.ts           # stdin 解析
│   ├── config.ts          # 配置管理（GLM_API_KEY）
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

推荐在 Claude Code 中直接执行：

```text
@一键安装.md
```

安装文档会引导完成依赖安装、构建和 `statusLine` 配置。

如果你在维护项目本身，再使用下面的开发命令。

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

## 手动测试

```bash
echo '{"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":90000},"used_percentage":45}}' | node dist/index.js
```

预期输出应包含类似：

```text
📊上下文:[███████████████░░░░░░░░░] 45% (90K/200K)
```
