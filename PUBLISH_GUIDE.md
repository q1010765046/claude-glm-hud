# 发布指南

本文档详细说明如何将 GLM-HUD 插件发布到 Claude Code Marketplace。

## 前置准备

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建新的公开仓库
3. 仓库名称：`claude-glm-hud`
4. 描述：`Claude Code 状态栏插件：实时显示智谱 AI Token 使用率和上下文窗口信息`
5. 添加 Topics：`claude-code`, `statusline`, `glm`, `hud`, `plugin`, `typescript`
6. **不要**初始化 README、.gitignore 或 license（我们已有这些文件）

### 2. 生成 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 设置：
   - **Note**: `Claude Code Marketplace`
   - **Expiration**: 选择合适的过期时间（或无过期）
   - **Scopes**: 勾选 `repo`（完整仓库访问权限）
4. 点击 "Generate token"
5. **重要**：复制生成的 token（只显示一次）

### 3. 配置 Claude Code

在终端中执行：

```bash
# 方式 1：使用 claude 命令
claude auth github

# 输入你的 GitHub Token
```

或手动配置 `~/.claude/settings.json`：

```json
{
  "github": {
    "token": "你的GitHub_Token"
  }
}
```

### 4. 准备仓库信息

更新以下文件中的占位符：

**package.json**:
```json
{
  "repository": {
    "url": "https://github.com/你的用户名/claude-glm-hud"
  },
  "homepage": "https://github.com/你的用户名/claude-glm-hud#readme",
  "bugs": {
    "url": "https://github.com/你的用户名/claude-glm-hud/issues"
  }
}
```

**.claude-plugin/plugin.json**:
```json
{
  "homepage": "https://github.com/你的用户名/claude-glm-hud",
  "repository": "https://github.com/你的用户名/claude-glm-hud"
}
```

## 发布步骤

### 步骤 1：构建项目

```bash
cd D:/myProject/claude-glm-hud

# 安装依赖
npm install

# 构建项目
npm run build
```

### 步骤 2：初始化 Git 仓库

```bash
# 初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial release: GLM-HUD v1.0.0"
```

### 步骤 3：连接到 GitHub 仓库

```bash
# 添加远程仓库（替换为你的用户名）
git remote add origin https://github.com/你的用户名/claude-glm-hud.git

# 推送代码
git branch -M main
git push -u origin main
```

### 步骤 4：创建版本标签

```bash
# 创建标签
git tag v1.0.0

# 推送标签
git push --tags
```

### 步骤 5：发布到 Marketplace

```bash
# 在项目根目录执行
claude marketplace publish
```

Claude Code 会自动：
1. 验证插件元数据
2. 检查必需文件
3. 创建 GitHub Release
4. 提交到 Marketplace

## 验证发布

### 1. 检查 GitHub Release

访问：`https://github.com/你的用户名/claude-glm-hud/releases`

确认 v1.0.0 Release 已创建。

### 2. 在 Marketplace 中搜索

在 Claude Code 中执行：
```
/marketplace
```

搜索 "claude-glm-hud"，应该能找到你的插件。

### 3. 测试安装

1. 在 Claude Code 中点击 "Install"
2. 重启 Claude Code
3. 检查状态栏是否正常显示

## 更新发布

### 发布新版本

1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md`
3. 提交更改：
   ```bash
   git add .
   git commit -m "Release v1.0.1"
   git push
   ```
4. 创建新标签：
   ```bash
   git tag v1.0.1
   git push --tags
   ```
5. 发布：
   ```bash
   claude marketplace publish
   ```

## 常见问题

### Q: 发布失败，提示权限错误

**A**: 检查：
1. GitHub Token 是否正确配置
2. Token 是否有 `repo` 权限
3. 仓库是否为公开仓库

### Q: 插件在 Marketplace 中找不到

**A**: 可能需要等待几分钟索引更新。如果超过 15 分钟仍找不到，检查：
1. `marketplace.json` 格式是否正确
2. 插件名称是否唯一
3. 是否有违反 Marketplace 规范的内容

### Q: 安装后状态栏不显示

**A**: 检查：
1. `dist/index.js` 是否存在
2. `package.json` 中的 `main` 字段是否正确
3. 手动执行 `node dist/index.js` 测试

## 安全注意事项

1. **永远不要**将 GitHub Token 提交到仓库
2. **永远不要**在公开代码中暴露 API 密钥
3. 定期更新 GitHub Token
4. 使用 `.gitignore` 排除敏感文件

## 后续维护

### 监控用户反馈

- 定期检查 GitHub Issues
- 关注 Marketplace 评分和评论
- 及时响应问题和建议

### 版本规划

- **主版本 (Major)**: 破坏性更改
- **次版本 (Minor)**: 新功能
- **修订版本 (Patch)**: Bug 修复

示例：
- `1.0.0` → `2.0.0`: 重大架构更改
- `1.0.0` → `1.1.0`: 新增功能
- `1.0.0` → `1.0.1`: Bug 修复

---

如有问题，请参考：
- [Claude Code 文档](https://docs.anthropic.com/claude/docs/plugins)
- [Marketplace 规范](https://anthropic.com/claude-code/marketplace.schema.json)
