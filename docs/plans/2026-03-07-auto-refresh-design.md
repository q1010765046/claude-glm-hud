# GLM-HUD 30秒自动刷新设计文档

**日期:** 2026-03-07
**作者:** Claude
**状态:** 设计完成，待实施

---

## 1. 背景

### 1.1 问题
GLM-HUD在执行过程中没有刷新机制，导致Token使用率显示滞后：
- 开始时显示9%
- 执行过程中Token已使用到90%
- 只有Stop Hook触发时才刷新显示
- 用户无法及时了解Token使用情况

### 1.2 现有机制
- **SessionStart Hook:** 启动时调用API更新缓存
- **Stop Hook:** 回复结束时调用API更新缓存
- **statusLine:** 每300ms显示缓存数据（不调用API）

---

## 2. 设计方案

### 2.1 核心思路
在statusLine脚本中添加30秒自动刷新机制：
- statusLine每300ms被调用一次
- 每次检查距离上次刷新是否超过30秒
- 如果超过30秒，同步调用API刷新缓存
- Hook刷新时更新时间戳，重置30秒计时

### 2.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    时间戳文件                            │
│          ~/.claude/last_refresh_timestamp               │
└─────────────────────────────────────────────────────────┘
         ↑                                    ↑
    [读取检查]                           [更新写入]
         ↓                                    ↓
┌─────────────────────┐            ┌─────────────────────┐
│   token_usage_      │            │   token_update.py   │
│   display.py        │            │   (Hook脚本)         │
│   (statusLine)      │            │                     │
│                     │            │  • SessionStart     │
│  • 每300ms调用      │            │  • Stop             │
│  • 检查时间戳       │            │  • 刷新后更新时间戳  │
│  • ≥30秒→调用API    │            │  • 重置30秒计时      │
│  • <30秒→显示缓存   │            │                     │
└─────────────────────┘            └─────────────────────┘
```

---

## 3. 实现细节

### 3.1 新增文件
无

### 3.2 修改文件

#### 3.2.1 `token_usage_display.py`

**新增常量:**
```python
TIMESTAMP_FILE = os.path.expanduser("~/.claude/last_refresh_timestamp")
REFRESH_INTERVAL = 30  # 刷新间隔（秒）
```

**新增函数:**
```python
def get_last_refresh_time():
    """获取上次刷新时间戳"""
    try:
        if os.path.exists(TIMESTAMP_FILE):
            with open(TIMESTAMP_FILE, 'r') as f:
                return int(f.read().strip())
    except:
        pass
    return 0

def should_refresh():
    """检查是否需要刷新"""
    last_time = get_last_refresh_time()
    return time.time() - last_time >= REFRESH_INTERVAL

def update_refresh_timestamp():
    """更新刷新时间戳"""
    try:
        os.makedirs(os.path.dirname(TIMESTAMP_FILE), exist_ok=True)
        with open(TIMESTAMP_FILE, 'w') as f:
            f.write(str(int(time.time())))
    except:
        pass
```

**修改主函数逻辑:**
```python
def main():
    # 原有缓存检查逻辑...

    # 新增：检查是否需要主动刷新
    if should_refresh():
        new_data = query_usage()
        if new_data:
            save_cache(new_data)
            update_refresh_timestamp()

    # 原有显示逻辑...
```

#### 3.2.2 `token_update.py`

**新增常量:**
```python
TIMESTAMP_FILE = os.path.expanduser("~/.claude/last_refresh_timestamp")
```

**新增函数:**
```python
def update_refresh_timestamp():
    """更新刷新时间戳"""
    try:
        os.makedirs(os.path.dirname(TIMESTAMP_FILE), exist_ok=True)
        with open(TIMESTAMP_FILE, 'w') as f:
            f.write(str(int(time.time())))
    except:
        pass
```

**修改保存缓存逻辑:**
```python
if usage_data:
    save_cache(usage_data, 0)
    update_refresh_timestamp()  # 新增：更新时间戳
```

---

## 4. 行为说明

### 4.1 正常流程
1. cc启动 → SessionStart Hook刷新 → 更新时间戳
2. statusLine显示 → 检查时间戳 → 未到30秒 → 显示缓存
3. 30秒后 → statusLine检查 → 已到30秒 → 调用API刷新 → 更新时间戳
4. Stop Hook触发 → 调用API刷新 → 更新时间戳 → 重置30秒计时

### 4.2 兼容性
- Hook刷新后，30秒内statusLine不会再重复刷新
- 无Hook时，statusLine每30秒自动刷新
- cc关闭时，statusLine停止，刷新自然停止

### 4.3 性能影响
- 每30秒发起一次GET请求，负载极低
- 同步调用可能导致短暂卡顿（<1秒），可接受

---

## 5. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| API响应慢导致显示卡顿 | 低 | GET请求通常很快，可接受 |
| 时间戳文件损坏 | 低 | 异常处理，文件损坏时默认刷新 |
| API速率限制 | 低 | 30秒间隔很保守，现有Hook机制已有速率限制处理 |

---

## 6. 测试计划

1. **功能测试:** 验证30秒后自动刷新
2. **兼容测试:** 验证Hook刷新重置计时
3. **边界测试:** 时间戳文件不存在/损坏情况
4. **性能测试:** API响应时间对显示的影响

---

## 7. 实施检查清单

- [ ] 修改 `token_usage_display.py` 添加时间戳检查和刷新逻辑
- [ ] 修改 `token_update.py` 添加时间戳更新逻辑
- [ ] 测试30秒自动刷新功能
- [ ] 测试Hook刷新重置计时功能
- [ ] 测试时间戳文件异常情况
- [ ] 验证cc关闭时无进程遗留
