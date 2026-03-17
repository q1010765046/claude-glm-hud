@echo off
REM GLM-HUD Windows 自动安装脚本
REM 从当前目录复制文件到插件目录

setlocal enabledelayedexpansion

echo ======================================
echo     GLM-HUD 自动安装脚本
echo ======================================
echo.

REM 插件目录
set PLUGIN_DIR=%USERPROFILE%\.claude\plugins\claude-glm-hud
set SETTINGS_FILE=%USERPROFILE%\.claude\settings.json

REM 获取当前脚本所在目录
set CURRENT_DIR=%~dp0
REM 去除末尾的反斜杠
set CURRENT_DIR=%CURRENT_DIR:~0,-1%

echo 当前目录: %CURRENT_DIR%
echo 目标目录: %PLUGIN_DIR%
echo.

REM 1. 检查 Node.js
echo [1/4] 检查 Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo     错误: 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)
node --version

REM 2. 构建插件
echo.
echo [2/4] 构建插件...
cd /d "%CURRENT_DIR%"
if not exist "node_modules" (
    echo     首次安装，安装依赖...
    call npm install
)
call npm run build

if not exist "dist\index.js" (
    echo     错误: 构建失败，dist\index.js 不存在
    pause
    exit /b 1
)

REM 3. 复制文件到插件目录
echo.
echo [3/4] 复制文件到插件目录...

REM 创建目标目录
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"

REM 复制编译后的文件
echo     复制 dist\index.js ...
copy /Y "%CURRENT_DIR%\dist\index.js" "%PLUGIN_DIR%\index.js" >nul

echo     复制 dist\index.js.map ...
if exist "%CURRENT_DIR%\dist\index.js.map" (
    copy /Y "%CURRENT_DIR%\dist\index.js.map" "%PLUGIN_DIR%\index.js.map" >nul
)

echo     复制 package.json ...
if exist "%CURRENT_DIR%\package.json" (
    copy /Y "%CURRENT_DIR%\package.json" "%PLUGIN_DIR%\package.json" >nul
)

echo     复制 README.md ...
if exist "%CURRENT_DIR%\README.md" (
    copy /Y "%CURRENT_DIR%\README.md" "%PLUGIN_DIR%\README.md" >nul
)

REM 4. 配置 statusLine
echo.
echo [4/4] 配置 statusLine...

if not exist "%USERPROFILE%\.claude" mkdir "%USERPROFILE%\.claude"
if not exist "%SETTINGS_FILE%" echo {}>"%SETTINGS_FILE%"

REM 使用 Node.js 修改 JSON
node -e "const fs=require('fs');const pluginDir=process.argv[1].replace(/\\\\/g,'/');const settingsPath=process.argv[2];const s=JSON.parse(fs.readFileSync(settingsPath,'utf8'));s.statusLine={type:'command',command:'node '+pluginDir+'/index.js'};fs.writeFileSync(settingsPath,JSON.stringify(s,null,2));" "%PLUGIN_DIR%" "%SETTINGS_FILE%"

echo.
echo ======================================
echo     安装完成！
echo ======================================
echo.
echo 请重启 Claude Code 使配置生效。
echo.
echo 配置文件：%SETTINGS_FILE%
echo 插件目录：%PLUGIN_DIR%
echo.
echo 当前目录可以删除或移动，不影响插件使用。
echo.

pause
