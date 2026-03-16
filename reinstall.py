#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GLM-HUD 一键重装脚本
自动卸载并重新安装 GLM-HUD 功能
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


def print_step(step, message):
    """打印步骤信息"""
    print(f"[{step}] {message}")


def print_status(status, message):
    """打印状态信息"""
    status_map = {
        'success': '[成功]',
        'error': '[失败]',
        'warning': '[警告]',
        'info': '[信息]'
    }
    print(f"    {status_map.get(status, status)} {message}")


def uninstall():
    """卸载 GLM-HUD"""
    print_step("1/4", "清理现有文件...")

    files_to_delete = [
        os.path.join(HOOKS_DIR, "token_update.py"),
        os.path.join(HOOKS_DIR, "token_usage_display.py"),
        os.path.join(HOOKS_DIR, "restore_glm_hud_config.py"),
        os.path.join(CLAUDE_DIR, "token_cache.json"),
        os.path.join(CLAUDE_DIR, "glm-hud-config.json"),
        os.path.join(CLAUDE_DIR, "debug", "restore_config.log"),
    ]

    deleted_count = 0
    for file_path in files_to_delete:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print_status('success', f'删除 {os.path.basename(file_path)}')
                deleted_count += 1
            except Exception as e:
                print_status('warning', f'删除 {os.path.basename(file_path)} 失败: {e}')

    if deleted_count == 0:
        print_status('info', '没有找到需要清理的文件')

    return True


def clean_settings():
    """清理 settings.json 中的 GLM-HUD 配置"""
    print_step("2/4", "清理 settings.json 配置...")

    if not os.path.exists(SETTINGS_FILE):
        print_status('warning', 'settings.json 不存在')
        return True

    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            settings = json.load(f)

        modified = False

        # 清理 hooks 配置
        if 'hooks' in settings:
            # 清理 SessionStart hooks
            if 'SessionStart' in settings['hooks']:
                original_count = len(settings['hooks']['SessionStart'])
                settings['hooks']['SessionStart'] = [
                    h for h in settings['hooks']['SessionStart']
                    if not any(
                        hk.get('command', '') and
                        ('token_update' in hk.get('command', '') or
                         'token_usage_display' in hk.get('command', '') or
                         'restore_glm_hud' in hk.get('command', ''))
                        for hk in h.get('hooks', [])
                    )
                ]
                if len(settings['hooks']['SessionStart']) != original_count:
                    modified = True

            # 清理 Stop hooks
            if 'Stop' in settings['hooks']:
                original_count = len(settings['hooks']['Stop'])
                settings['hooks']['Stop'] = [
                    h for h in settings['hooks']['Stop']
                    if not any(
                        hk.get('command', '') and
                        ('token_update' in hk.get('command', '') or
                         'token_usage_display' in hk.get('command', '') or
                         'restore_glm_hud' in hk.get('command', ''))
                        for hk in h.get('hooks', [])
                    )
                ]
                if len(settings['hooks']['Stop']) != original_count:
                    modified = True

        # 清理 statusLine 配置
        if 'statusLine' in settings:
            status_line_cmd = settings['statusLine'].get('command', '')
            if 'token_usage_display' in status_line_cmd:
                del settings['statusLine']
                modified = True

        # 写回文件
        if modified:
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
            print_status('success', '已清理 settings.json 中的 GLM-HUD 配置')
        else:
            print_status('info', 'settings.json 中没有需要清理的配置')

        return True

    except Exception as e:
        print_status('error', f'清理 settings.json 失败: {e}')
        return False


def reinstall():
    """重新安装"""
    print_step("3/4", "运行安装脚本...")

    install_script = os.path.join(SCRIPT_DIR, "install.py")

    if not os.path.exists(install_script):
        print_status('error', 'install.py 不存在')
        return False

    try:
        # 设置环境变量，让 install.py 使用静默模式
        env = os.environ.copy()
        env['GLM_HUD_REINSTALL_MODE'] = '1'

        result = subprocess.run(
            [sys.executable, install_script],
            cwd=SCRIPT_DIR,
            capture_output=False,
            env=env
        )
        # 即使验证失败，只要文件被复制成功就算成功
        token_update = os.path.join(HOOKS_DIR, "token_update.py")
        token_display = os.path.join(HOOKS_DIR, "token_usage_display.py")
        if os.path.exists(token_update) and os.path.exists(token_display):
            print_status('success', '文件已正确安装')
            return True
        else:
            print_status('error', '文件安装失败')
            return False
    except Exception as e:
        print_status('error', f'运行安装脚本失败: {e}')
        return False


def verify():
    """验证安装"""
    print_step("4/4", "验证安装...")

    token_update = os.path.join(HOOKS_DIR, "token_update.py")
    token_display = os.path.join(HOOKS_DIR, "token_usage_display.py")

    all_ok = True

    if os.path.exists(token_update):
        print_status('success', 'token_update.py 已安装')
    else:
        print_status('error', 'token_update.py 未安装')
        all_ok = False

    if os.path.exists(token_display):
        print_status('success', 'token_usage_display.py 已安装')
    else:
        print_status('error', 'token_usage_display.py 未安装')
        all_ok = False

    return all_ok


def main():
    """主函数"""
    print("=" * 60)
    print("           GLM-HUD 一键重装脚本")
    print("=" * 60)
    print()

    # 步骤 1：卸载
    if not uninstall():
        print()
        print_status('error', '卸载失败')
        return False

    print()

    # 步骤 2：清理配置
    if not clean_settings():
        print()
        print_status('error', '清理配置失败')
        return False

    print()

    # 步骤 3：重新安装
    if not reinstall():
        print()
        print_status('error', '安装失败')
        return False

    print()

    # 步骤 4：验证
    if verify():
        print()
        print("=" * 60)
        print("              重装成功！")
        print("=" * 60)
        print()
        print("请重启 Claude Code 以使配置生效。")
        print()
        return True
    else:
        print()
        print("=" * 60)
        print("          重装完成（部分失败）")
        print("=" * 60)
        print()
        print("请检查上面的错误信息。")
        print()
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n[中断] 用户取消操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n[错误] 发生异常: {e}")
        sys.exit(1)
