# 安全说明

## ⚠️ 重要提示

本项目源文件中的 API 密钥使用占位符，请**勿将** `~/.claude/hooks/` 目录中的已安装文件分享给他人。

## 安装前准备

在运行安装脚本之前，请确保您的 `~/.claude/settings.json` 文件中包含以下配置：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "您的智谱AI_API密钥"
  }
}
```

## 获取 API 密钥

1. 访问智谱 AI 开放平台：https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入 API 密钥管理页面
4. 复制您的 API 密钥
5. 将密钥添加到 `~/.claude/settings.json` 的 `env.ANTHROPIC_AUTH_TOKEN` 字段

## 安装步骤

### Windows 用户

双击运行 `重装GLM-HUD.bat` 或在命令行执行：

```bash
python install.py
```

### macOS/Linux 用户

```bash
python3 install.py
```

## 工作原理

1. `install.py` 从您的 `~/.claude/settings.json` 中读取 `ANTHROPIC_AUTH_TOKEN`
2. 将源文件中的占位符替换为您的 API 密钥
3. 安装到 `~/.claude/hooks/` 目录

## 安全检查

安装后，您可以验证：

```bash
# 检查已安装的文件
cat ~/.claude/hooks/token_update.py | grep AUTH_TOKEN

# 应该显示您的实际密钥，而不是占位符
```

## 卸载

如需卸载，请手动删除以下文件：

```bash
rm ~/.claude/hooks/token_update.py
rm ~/.claude/hooks/token_usage_display.py
rm ~/.claude/token_cache.json
```

同时需要从 `~/.claude/settings.json` 中手动移除相关 hooks 配置。

## 快速重装

如需重装，请执行：

```bash
python reinstall.py
```

或使用批处理文件（Windows）：

```bash
重装GLM-HUD.bat
```
