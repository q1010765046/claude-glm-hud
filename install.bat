@echo off
REM GLM-HUD Windows 自动安装脚本

setlocal enabledelayedexpansion

echo ======================================
echo     GLM-HUD 自动安装脚本
echo ======================================
echo.

REM 插件目录
set PLUGIN_DIR=%USERPROFILE%\.claude\plugins\claude-glm-hud
set SETTINGS_FILE=%USERPROFILE%\.claude\settings.json

REM 1. 克隆仓库
echo [1/4] 克隆仓库...
if exist "%PLUGIN_DIR%" (
     echo     插件目录已存在，更新中...
     cd /d "%PLUGIN_DIR%"
     git pull
) else (
     echo     克隆仓库到 %PLUGIN_DIR%
     git clone https://github.com/q1010765046/claude-glm-hud.git "%PLUGIN_DIR%"
)

REM 2. 安装依赖
echo.
echo [2/4] 安装依赖...
cd /d "%PLUGIN_DIR%"
call npm install

REM 3. 构建插件
echo.
echo [3/4] 构建插件...
call npm run build

REM 4. 配置 statusLine
echo.
echo [4/4] 配置 statusLine...

REM 使用 Node.js 修改 JSON
node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('%SETTINGS_FILE%','utf8'));s.statusLine={type:'command',command:'node ~/.claude/plugins/claude-glm-hud/dist/index.js'};fs.writeFileSync('%SETTINGS_FILE%',JSON.stringify(s,null,2));"

echo.
echo ======================================
echo     安装完成！
echo ======================================
echo.
echo 请重启 Claude Code 使配置生效。
echo.
echo 配置文件：%SETTINGS_FILE%
echo 插件目录：%PLUGIN_DIR%

pause
