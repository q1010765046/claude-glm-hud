#!/bin/bash
# GLM-HUD 自动安装脚本

set -e

echo "======================================"
echo "    GLM-HUD 自动安装脚本"
echo "======================================"
echo ""

# 插件目录
PLUGIN_DIR="$HOME/.claude/plugins/claude-glm-hud"
SETTINGS_FILE="$HOME/.claude/settings.json"

# 1. 克隆仓库
echo "[1/4] 克隆仓库..."
if [ -d "$PLUGIN_DIR" ]; then
  echo "    插件目录已存在，更新中..."
  cd "$PLUGIN_DIR"
  git pull
else
  echo "    克隆仓库到 $PLUGIN_DIR"
  git clone https://github.com/q1010765046/claude-glm-hud.git "$PLUGIN_DIR"
fi

# 2. 安装依赖
echo ""
echo "[2/4] 安装依赖..."
cd "$PLUGIN_DIR"
npm install

# 3. 构建插件
echo ""
echo "[3/4] 构建插件..."
npm run build

# 4. 配置 statusLine
echo ""
echo "[4/4] 配置 statusLine..."

# 检查 settings.json 是否存在
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "    创建 settings.json"
  echo "{}" > "$SETTINGS_FILE"
fi

# 使用 Node.js 修改 JSON（更可靠）
node -e "
const fs = require('fs');
const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
settings.statusLine = {
  type: 'command',
  command: 'node ~/.claude/plugins/claude-glm-hud/dist/index.js'
};
fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
"

echo ""
echo "======================================"
echo "    安装完成！"
echo "======================================"
echo ""
echo "请重启 Claude Code 使配置生效。"
echo ""
echo "配置文件：$SETTINGS_FILE"
echo "插件目录：$PLUGIN_DIR"
