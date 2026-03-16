#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Token 使用率显示 Hook
从缓存文件读取 Token 使用情况并显示
缓存超过1分钟自动更新
"""

import json
import sys
import os
import time
import urllib.request
from datetime import datetime

# 设置 UTF-8 编码（Windows 兼容）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 配置
BASE_URL = "https://api.z.ai"
CACHE_FILE = os.path.expanduser("~/.claude/token_cache.json")
CACHE_TTL = 60  # 缓存有效期1分钟（秒）

# 时间戳文件配置
TIMESTAMP_FILE = os.path.expanduser("~/.claude/last_refresh_timestamp")
REFRESH_INTERVAL = 30  # 刷新间隔（秒）


def get_auth_token():
    """从 settings.json 读取 API Token"""
    try:
        settings_file = os.path.expanduser("~/.claude/settings.json")
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)
            return settings.get('env', {}).get('ANTHROPIC_AUTH_TOKEN', '')
    except Exception:
        return ''

# 颜色配置 (RGB)
# #86EFAC = RGB(134, 239, 172) - 薄荷绿
COLOR_RGB = "134;239;172"
COLOR_RESET = "\033[0m"
COLOR_SET = f"\033[38;2;{COLOR_RGB}m"


def query_usage():
    """查询 Token 使用情况"""
    url = f"{BASE_URL}/api/monitor/usage/quota/limit"
    auth_token = get_auth_token()

    if not auth_token:
        return None

    request = urllib.request.Request(url)
    request.add_header("Authorization", auth_token)
    request.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return parse_usage(data)
    except Exception:
        pass
    return None


def parse_usage(data):
    """解析 API 响应"""
    try:
        result = {
            "token_percent": None,
            "mcp_percent": None,
            "token_reset_timestamp": None,
            "mcp_reset_timestamp": None
        }

        limits = data.get('data', {}).get('limits', [])

        for limit in limits:
            limit_type = limit.get('type', '')
            if limit_type == 'TOKENS_LIMIT':
                result['token_percent'] = limit.get('percentage')
                result['token_reset_timestamp'] = limit.get('nextResetTime')
            elif limit_type == 'TIME_LIMIT':
                result['mcp_percent'] = limit.get('percentage')
                result['mcp_reset_timestamp'] = limit.get('nextResetTime')

        return result
    except Exception:
        pass
    return None


def load_cache_full():
    """加载完整缓存数据"""
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return None


def save_cache(data):
    """保存到缓存文件"""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        cache_data = {
            "data": data,
            "updated_at": int(time.time()),
            "rate_limited_until": 0
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False)
        return True
    except Exception:
        return False


def get_last_refresh_time():
    """获取上次刷新时间戳"""
    try:
        if os.path.exists(TIMESTAMP_FILE):
            with open(TIMESTAMP_FILE, 'r', encoding='utf-8') as f:
                return int(f.read().strip())
    except Exception:
        pass
    return 0


def should_refresh():
    """检查是否需要刷新（距离上次刷新超过REFRESH_INTERVAL秒）"""
    last_time = get_last_refresh_time()
    return time.time() - last_time >= REFRESH_INTERVAL


def update_refresh_timestamp():
    """更新刷新时间戳为当前时间"""
    try:
        os.makedirs(os.path.dirname(TIMESTAMP_FILE), exist_ok=True)
        with open(TIMESTAMP_FILE, 'w', encoding='utf-8') as f:
            f.write(str(int(time.time())))
    except Exception:
        pass


def get_display_width(s):
    """计算字符串的实际显示宽度（中文/emoji 算 2，ASCII 算 1）"""
    width = 0
    for char in s:
        if ord(char) > 127:
            width += 2
        else:
            width += 1
    return width


def format_progress_bar(percent, width=20):
    """格式化进度条（带颜色，不重置颜色以便后续文字也带颜色）"""
    filled = int(width * percent / 100)
    empty = width - filled
    bar = f"{COLOR_SET}[{'█' * filled}{'░' * empty}]"
    return bar


def format_reset_time(reset_timestamp_ms):
    """根据 API 返回的时间戳计算重置倒计时（返回文本和剩余秒数）"""
    if not reset_timestamp_ms:
        return None, 0, 0

    try:
        reset_dt = datetime.fromtimestamp(reset_timestamp_ms / 1000)
        now = datetime.now()
        delta = reset_dt - now
        total_seconds = int(delta.total_seconds())

        if total_seconds < 0:
            return "已重置", 0, 0

        # 5小时为刷新周期，用剩余时间计算进度（剩余越多进度越少）
        cycle_seconds = 18000  # 5小时
        # 反转逻辑：剩余时间越多，百分比越小；即将刷新时百分比接近100%
        used_percent = min(100, max(0, int((cycle_seconds - total_seconds) * 100 / cycle_seconds)))

        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        minutes = (total_seconds % 3600) // 60

        parts = []
        if days > 0:
            parts.append(f"{days}天")
        if hours > 0:
            parts.append(f"{hours}小时")
        if minutes > 0 or (days == 0 and hours == 0):
            parts.append(f"{minutes}分")

        time_text = ''.join(parts) if parts else '0分'
        return time_text, total_seconds, used_percent
    except Exception:
        return "未知", 0, 0


def main():
    """主函数"""
    current_time = int(time.time())
    cache_full = load_cache_full()
    data = None
    should_update = False

    # 检查是否需要更新缓存
    if not cache_full:
        should_update = True
    elif cache_full.get('data', {}).get('token_percent') is None:
        should_update = True
    elif current_time - cache_full.get('updated_at', 0) > CACHE_TTL:
        should_update = True

    # 新增：检查是否需要主动刷新（30秒自动刷新机制）
    if not should_update and should_refresh():
        should_update = True

    # 如果需要更新，尝试调用API
    if should_update:
        new_data = query_usage()
        if new_data:
            save_cache(new_data)
            update_refresh_timestamp()  # 更新刷新时间戳
            data = new_data

    # 如果API调用失败或不需要更新，使用缓存数据
    if not data and cache_full:
        data = cache_full.get('data')

    if not data or data.get('token_percent') is None:
        print("🔄等待数据...")
        return

    token_percent = data['token_percent']
    mcp_percent = data.get('mcp_percent')
    reset_time_text, reset_seconds, used_percent = format_reset_time(data.get('token_reset_timestamp'))

    # 进度条宽度（增加到20以便小百分比也能显示）
    bar_width = 20

    # 1. Token 进度条
    token_str = f"{COLOR_SET}🔋Token:{format_progress_bar(token_percent, bar_width)} {token_percent:>3}%{COLOR_RESET}"

    # 2. 剩余时间进度条
    parts = [token_str]
    if reset_time_text:
        parts.append(f"{COLOR_SET}🔄剩余:{format_progress_bar(used_percent, bar_width)} {reset_time_text}{COLOR_RESET}")

    # 3. MCP 进度条
    if mcp_percent is not None:
        parts.append(f"{COLOR_SET}🌐MCP:{format_progress_bar(mcp_percent, bar_width)} {mcp_percent:>3}%{COLOR_RESET}")

    # 组合内容
    content = " │ ".join(parts)

    # statusLine 单行模式
    print(content)


if __name__ == "__main__":
    main()
