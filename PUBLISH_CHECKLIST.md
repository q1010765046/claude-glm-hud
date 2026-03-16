# 发布清单

发布 GLM-HUD 插件到 Claude Code Marketplace 之前，请确认以下事项：

## 前置条件

### GitHub 仓库
- [ ] 已创建公开 GitHub 仓库
- [ ] 仓库描述清晰
- [ ] 添加了 topics 标签（claude-code, statusline, glm, hud）

### GitHub Token
- [ ] 已生成 Personal Access Token
- [ ] Token 权限包含 `repo`（完整仓库访问权限）
- [ ] Token 已添加到 Claude Code 配置

### Claude Code 配置
```bash
# 验证配置
claude auth github
```

## 文件检查

### 必需文件
- [ ] `.claude-plugin/plugin.json` - 插件清单
- [ ] `.claude-plugin/marketplace.json` - 市场配置
- [ ] `README.md` - 使用文档
- [ ] `CLAUDE.md` - 项目指南
- [ ] `LICENSE` - MIT 许可证

### 命令文件
- [ ] `commands/setup.md` - 安装命令
- [ ] `commands/configure.md` - 配置命令

### 源代码
- [ ] `src/index.ts` - 主入口
- [ ] `src/types.ts` - 类型定义
- [ ] `src/stdin.ts` - stdin 解析
- [ ] `src/config.ts` - 配置管理
- [ ] `src/glm-api.ts` - API 集成
- [ ] `src/cache.ts` - 缓存管理
- [ ] `src/render/` - 渲染模块

### 配置文件
- [ ] `package.json` - NPM 配置
- [ ] `tsconfig.json` - TypeScript 配置
- [ ] `build.ts` - 构建脚本

## 功能测试

### 本地测试
- [ ] 构建成功：`npm run build`
- [ ] 本地运行成功：`npm run dev`
- [ ] 所有渲染行正常显示

### 状态栏测试
- [ ] statusLine 配置正确
- [ ] 上下文信息显示正确
- [ ] Token 使用率显示正确
- [ ] MCP 使用率显示正确
- [ ] 进度条颜色正确（绿/黄/红）

### 配置测试
- [ ] compact 模式正常
- [ ] expanded 模式正常
- [ ] 配置修改生效

## 代码质量

### 类型检查
- [ ] 无 TypeScript 错误
- [ ] 所有类型已定义

### 代码规范
- [ ] 无 console.log 调试代码
- [ ] 错误处理完善
- [ ] 注释清晰

### 性能
- [ ] 缓存机制正常
- [ ] 无阻塞操作
- [ ] API 调用有超时

## 元数据检查

### plugin.json
- [ ] name 唯一且描述性
- [ ] description 清晰
- [ ] version 与 package.json 一致
- [ ] keywords 相关

### marketplace.json
- [ ] 符合 schema
- [ ] source 路径正确
- [ ] category 合适

## 发布步骤

### 1. 提交代码
```bash
git add .
git commit -m "Release v1.0.0"
git push
```

### 2. 创建标签
```bash
git tag v1.0.0
git push --tags
```

### 3. 构建发布版本
```bash
npm run build
```

### 4. 发布到 Marketplace
```bash
claude marketplace publish
```

## 发布后验证

### Marketplace
- [ ] 可在 Marketplace 中搜索到插件
- [ ] 插件描述显示正确

### 安装测试
- [ ] 可以从 Marketplace 安装
- [ ] 安装后自动配置 statusLine
- [ ] 重启后状态栏正常显示

### 用户反馈
- [ ] 准备接收用户反馈
- [ ] Issues 页面可用

## 发布后检查清单

- [ ] 更新 CHANGELOG.md
- [ ] 在 GitHub 创建 Release
- [ ] 发布公告（可选）
- [ ] 监控问题和反馈

## 回滚计划

如果发布后发现问题：

1. 更新 `plugin.json` 中的版本号
2. 修复问题
3. 提交新版本
4. 重新发布

## 注意事项

1. **GitHub Token 安全**：不要提交 Token 到仓库
2. **版本号规范**：遵循语义化版本（Semantic Versioning）
3. **Breaking Changes**：如有破坏性更新，更新主版本号
4. **依赖检查**：确保没有不必要的依赖
5. **兼容性**：测试不同 Claude Code 版本

## 联系方式

如有问题，请提交 Issue：
https://github.com/YOUR_USERNAME/claude-glm-hud/issues
