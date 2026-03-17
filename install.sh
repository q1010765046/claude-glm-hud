#!/bin/bash
# GLM-HUD 自动安装脚本
# 从当前目录复制文件到插件目录

set -e

echo "======================================"
echo "    GLM-HUD 自动安装脚本"
echo "======================================"
echo ""

# 插件目录
PLUGIN_DIR="$HOME/.claude/plugins/claude-glm-hud"
SETTINGS_FILE="$HOME/.claude/settings.json"

# 获取当前脚本所在目录
CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "当前目录: $CURRENT_DIR"
echo "目标目录: $PLUGIN_DIR"
echo ""

# 1. 检查 Node.js
echo "[1/4] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "    错误: 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi
node --version

# 2. 构建插件
echo ""
echo "[2/4] 构建插件..."
cd "$CURRENT_DIR"
if [ ! -d "node_modules" ]; then
    echo "    首次安装，安装依赖..."
    npm install
fi
npm run build

if [ ! -f "dist/index.js" ]; then
    echo "    错误: 构建失败，dist/index.js 不存在"
    exit 1
fi

# 3. 复制文件到插件目录
echo ""
echo "[3/4] 复制文件到插件目录..."

# 创建目标目录
mkdir -p "$PLUGIN_DIR"

# 复制编译后的文件
echo "    复制 dist/index.js ..."
cp "$CURRENT_DIR/dist/index.js" "$PLUGIN_DIR/index.js"

echo "    复制 dist/index.js.map ..."
if [ -f "$CURRENT_DIR/dist/index.js.map" ]; then
    cp "$CURRENT_DIR/dist/index.js.map" "$PLUGIN_DIR/index.js.map"
fi

echo "    复制 package.json ..."
if [ -f "$CURRENT_DIR/package.json" ]; then
    cp "$CURRENT_DIR/package.json" "$PLUGIN_DIR/package.json"
fi

echo "    复制 README.md ..."
if [ -f "$CURRENT_DIR/README.md" ]; then
    cp "$CURRENT_DIR/README.md" "$PLUGIN_DIR/README.md"
fi

# 4. 配置 statusLine
echo ""
echo "[4/4] 配置 statusLine..."

# 检查 settings.json 是否存在
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "    创建 settings.json"
    echo "{}" > "$SETTINGS_FILE"
fi

# 使用 Node.js 修改 JSON
node -e "
const fs = require('fs');
const pluginDir = process.argv[1].replace(/\\\\/g, '/');
const settingsPath = process.argv[2];
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
settings.statusLine = {
  type: 'command',
  command: 'node ' + pluginDir + '/index.js'
};
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
" "$PLUGIN_DIR" "$SETTINGS_FILE"

echo ""
echo "======================================"
echo "    安装完成！"
echo "======================================"
echo ""
echo "请重启 Claude Code 使配置生效。"
echo ""
echo "配置文件: $SETTINGS_FILE"
echo "插件目录: $PLUGIN_DIR"
echo ""
echo "当前目录可以删除或移动，不影响插件使用。"
echo ""
