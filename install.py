#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GLM-HUD 自动安装脚本
自动配置 Token 使用率显示功能
"""

import json
import os
import sys
import shutil
import subprocess

# Windows UTF-8 兼容
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 配置路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
CLAUDE_DIR = os.path.join(HOME, ".claude")
HOOKS_DIR = os.path.join(CLAUDE_DIR, "hooks")
SETTINGS_FILE = os.path.join(CLAUDE_DIR, "settings.json")

# 源文件
TOKEN_UPDATE_SRC = os.path.join(SCRIPT_DIR, "token_update.py")
TOKEN_DISPLAY_SRC = os.path.join(SCRIPT_DIR, "token_usage_display.py")

# 目标文件
TOKEN_UPDATE_DST = os.path.join(HOOKS_DIR, "token_update.py")
TOKEN_DISPLAY_DST = os.path.join(HOOKS_DIR, "token_usage_display.py")


def print_step(step, message):
    """打印步骤信息"""
    print(f"[{step}] {message}")


def get_auth_token():
    """从 settings.json 获取 AUTH_TOKEN"""
    print_step("1", "获取 AUTH_TOKEN...")

    if not os.path.exists(SETTINGS_FILE):
        print("    [错误] settings.json 文件不存在")
        return None

    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            settings = json.load(f)

        auth_token = settings.get('env', {}).get('ANTHROPIC_AUTH_TOKEN')
        if auth_token:
            print(f"    [成功] 找到 AUTH_TOKEN: {auth_token[:20]}...")
            return auth_token
        else:
            print("    [错误] settings.json 中未找到 ANTHROPIC_AUTH_TOKEN")
            return None
    except Exception as e:
        print(f"    [错误] 读取 settings.json 失败: {e}")
        return None


def create_hooks_dir():
    """创建 hooks 目录"""
    print_step("2", "创建 hooks 目录...")

    try:
        os.makedirs(HOOKS_DIR, exist_ok=True)
        print(f"    [成功] {HOOKS_DIR}")
        return True
    except Exception as e:
        print(f"    [错误] 创建目录失败: {e}")
        return False


def copy_and_update_scripts(auth_token):
    """复制脚本并替换 AUTH_TOKEN"""
    print_step("3", "复制脚本并配置 AUTH_TOKEN...")

    try:
        # 读取 token_update.py
        with open(TOKEN_UPDATE_SRC, 'r', encoding='utf-8') as f:
            content = f.read()

        # 替换 AUTH_TOKEN
        content = content.replace(
            'AUTH_TOKEN = "请从settings.json获取"',
            f'AUTH_TOKEN = "{auth_token}"'
        )

        # 写入目标文件
        with open(TOKEN_UPDATE_DST, 'w', encoding='utf-8') as f:
            f.write(content)

        # 复制 token_usage_display.py
        shutil.copy(TOKEN_DISPLAY_SRC, TOKEN_DISPLAY_DST)

        print(f"    [成功] token_update.py -> {TOKEN_UPDATE_DST}")
        print(f"    [成功] token_usage_display.py -> {TOKEN_DISPLAY_DST}")
        return True
    except Exception as e:
        print(f"    [错误] 复制脚本失败: {e}")
        return False


def update_settings_json():
    """更新 settings.json 添加 hooks 和 statusLine 配置"""
    print_step("4", "配置 settings.json...")

    if not os.path.exists(SETTINGS_FILE):
        print("    [错误] settings.json 文件不存在")
        return False

    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            settings = json.load(f)

        # 添加 hooks 配置
        if 'hooks' not in settings:
            settings['hooks'] = {}

        # SessionStart Hook
        if 'SessionStart' not in settings['hooks']:
            settings['hooks']['SessionStart'] = []

        session_start_hooks = settings['hooks']['SessionStart']
        if not session_start_hooks:
            session_start_hooks.append({'hooks': []})

        session_start_hooks[0]['hooks'].append({
            'type': 'command',
            'command': 'python ~/.claude/hooks/token_update.py'
        })

        # Stop Hook
        if 'Stop' not in settings['hooks']:
            settings['hooks']['Stop'] = []

        stop_hooks = settings['hooks']['Stop']
        if not stop_hooks:
            stop_hooks.append({'hooks': []})

        stop_hooks[0]['hooks'].append({
            'type': 'command',
            'command': 'python ~/.claude/hooks/token_update.py'
        })

        # statusLine 配置
        settings['statusLine'] = {
            'type': 'command',
            'command': 'STATUS_LINE=1 python ~/.claude/hooks/token_usage_display.py'
        }

        # 写回文件
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)

        print("    [成功] 已添加 SessionStart Hook")
        print("    [成功] 已添加 Stop Hook")
        print("    [成功] 已配置 statusLine")
        return True
    except Exception as e:
        print(f"    [错误] 更新 settings.json 失败: {e}")
        return False


def verify_installation():
    """验证安装是否成功"""
    print_step("5", "验证安装...")

    # 检查文件是否存在
    if not os.path.exists(TOKEN_UPDATE_DST):
        print("    [失败] token_update.py 未找到")
        return False
    if not os.path.exists(TOKEN_DISPLAY_DST):
        print("    [失败] token_usage_display.py 未找到")
        return False

    # 运行 token_update.py 测试
    print("    [测试] 调用 API 获取数据...")
    result = subprocess.run(
        [sys.executable, TOKEN_UPDATE_DST],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        timeout=15
    )

    cache_file = os.path.join(CLAUDE_DIR, "token_cache.json")
    if os.path.exists(cache_file):
        print("    [成功] 缓存文件已生成")

        # 测试显示脚本
        print("    [测试] 验证显示脚本...")
        env = os.environ.copy()
        env['STATUS_LINE'] = '1'
        result = subprocess.run(
            [sys.executable, TOKEN_DISPLAY_DST],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            env=env,
            timeout=5
        )

        if result.returncode == 0 and result.stdout and result.stdout.strip():
            print(f"    [成功] 显示输出: {result.stdout.strip()}")
            return True
        else:
            print("    [警告] 显示脚本测试失败")
            return False
    else:
        print("    [失败] 缓存文件未生成，请检查网络连接和 AUTH_TOKEN")
        return False


def main():
    """主函数"""
    # 检查是否是重装模式
    is_reinstall_mode = os.environ.get('GLM_HUD_REINSTALL_MODE') == '1'

    if not is_reinstall_mode:
        print("=" * 60)
        print("           GLM-HUD 自动安装脚本")
        print("=" * 60)
        print()

    # 步骤 1：获取 AUTH_TOKEN
    auth_token = get_auth_token()
    if not auth_token:
        print("\n[失败] 无法获取 AUTH_TOKEN，安装中止")
        return False

    # 步骤 2：创建 hooks 目录
    if not create_hooks_dir():
        print("\n[失败] 创建 hooks 目录失败，安装中止")
        return False

    # 步骤 3：复制脚本并替换 AUTH_TOKEN
    if not copy_and_update_scripts(auth_token):
        print("\n[失败] 复制脚本失败，安装中止")
        return False

    # 步骤 4：更新 settings.json
    if not update_settings_json():
        print("\n[失败] 更新 settings.json 失败，安装中止")
        return False

    # 步骤 5：验证安装
    if verify_installation():
        # 检查是否是重装模式
        is_reinstall_mode = os.environ.get('GLM_HUD_REINSTALL_MODE') == '1'

        if not is_reinstall_mode:
            print()
            print("=" * 60)
            print("            安装成功！")
            print("=" * 60)
            print()
            print("请重启 Claude Code 以使配置生效。")
            print()
            print("配置说明：")
            print("  - SessionStart Hook: 启动时自动查询 Token 使用情况")
            print("  - Stop Hook: 每次回复结束时自动更新")
            print("  - statusLine: 每 300ms 读取缓存显示")
            print()
        return True
    else:
        # 检查是否是重装模式
        is_reinstall_mode = os.environ.get('GLM_HUD_REINSTALL_MODE') == '1'

        if not is_reinstall_mode:
            print()
            print("=" * 60)
            print("            安装完成（部分验证失败）")
            print("=" * 60)
            print()
            print("请检查：")
            print("  1. 网络连接是否正常")
            print("  2. AUTH_TOKEN 是否正确")
            print("  3. 是否能访问 api.z.ai")
            print()
        else:
            print("    [警告] 验证失败，请检查网络和 AUTH_TOKEN")
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n[中断] 用户取消安装")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[错误] 安装过程中发生异常: {e}")
        sys.exit(1)
