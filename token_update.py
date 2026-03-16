#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Token 使用率更新 Hook
在 SessionStart 和 Stop 时机调用 API 更新缓存
避免频繁调用 API 导致速率限制
"""

import json
import os
import sys
import urllib.request
import time
from datetime import datetime

# Windows UTF-8 兼容
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 配置
BASE_URL = "https://api.z.ai"
CACHE_FILE = os.path.expanduser("~/.claude/token_cache.json")
RATE_LIMIT_PAUSE = 600  # 429 响应后暂停 10 分钟（秒）

# 时间戳文件配置
TIMESTAMP_FILE = os.path.expanduser("~/.claude/last_refresh_timestamp")

# 调试模式开关（生产环境设为False以避免高频I/O）
DEBUG_MODE = False


def get_auth_token():
    """从 settings.json 读取 API Token"""
    try:
        settings_file = os.path.expanduser("~/.claude/settings.json")
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)
            return settings.get('env', {}).get('ANTHROPIC_AUTH_TOKEN', '')
    except Exception:
        return ''


def query_usage():
    """查询 Token 使用情况"""
    url = f"{BASE_URL}/api/monitor/usage/quota/limit"
    auth_token = get_auth_token()

    if not auth_token:
        return None, "no_token"

    request = urllib.request.Request(url)
    request.add_header("Authorization", auth_token)
    request.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return parse_usage(data), None
            elif response.status == 429:
                return None, "rate_limited"
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return None, "rate_limited"
        return None, "http_error"
    except Exception:
        return None, "network_error"
    return None, "unknown_error"


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


def load_cache():
    """加载缓存文件"""
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return None


def save_cache(data, rate_limited_until=0):
    """保存到缓存文件"""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        cache_data = {
            "data": data,
            "updated_at": int(time.time()),
            "rate_limited_until": rate_limited_until
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False)
        return True
    except Exception:
        return False


def update_refresh_timestamp():
    """更新刷新时间戳为当前时间"""
    try:
        os.makedirs(os.path.dirname(TIMESTAMP_FILE), exist_ok=True)
        with open(TIMESTAMP_FILE, 'w', encoding='utf-8') as f:
            f.write(str(int(time.time())))
    except Exception:
        pass


def log_debug(message):
    """写入调试日志（仅在调试模式下启用）"""
    if not DEBUG_MODE:
        return
    try:
        debug_log = os.path.expanduser("~/.claude/debug/hook_debug.log")
        os.makedirs(os.path.dirname(debug_log), exist_ok=True)
        with open(debug_log, 'a', encoding='utf-8') as f:
            f.write(message)
    except Exception:
        pass


def main():
    """主函数"""
    log_debug(f"\n[{datetime.now().isoformat()}] token_update.py 执行开始\n")

    # 加载现有缓存（用于速率限制判断）
    cache = load_cache()
    current_time = int(time.time())

    # 检查是否处于速率限制暂停期
    if cache and cache.get('rate_limited_until', 0) > current_time:
        remaining = cache.get('rate_limited_until', 0) - current_time
        # 仍处于暂停期，静默跳过
        log_debug(f"  速率限制中，剩余 {remaining} 秒，跳过\n")
        return

    # 调用 API 查询
    usage_data, error = query_usage()

    if error == "rate_limited":
        # 遇到速率限制，设置暂停时间
        if cache:
            # 保留现有数据，只更新暂停时间
            save_cache(cache.get('data'), current_time + RATE_LIMIT_PAUSE)
        log_debug(f"  API 返回 429 速率限制\n")
        return

    if usage_data:
        # 成功获取数据，保存到缓存
        save_cache(usage_data, 0)
        update_refresh_timestamp()  # 更新时间戳，重置30秒计时
        log_debug(f"  成功更新缓存: {usage_data}\n")
    else:
        # API 调用失败，保持现有缓存不变
        log_debug(f"  API 调用失败: {error}\n")


if __name__ == "__main__":
    main()
