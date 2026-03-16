# GLM-HUD 30秒自动刷新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 为GLM-HUD添加30秒自动刷新机制，解决Token使用率显示滞后问题

**架构:** 在statusLine脚本中添加时间戳检查，超过30秒则同步调用API刷新；Hook刷新时更新时间戳重置计时

**技术栈:** Python 3, subprocess, file I/O

---

## 前置说明

**项目路径:** `D:/myProject/GLM-HUD`

**关键文件:**
- `token_usage_display.py` - statusLine显示脚本（每300ms调用一次）
- `token_update.py` - Hook脚本（SessionStart/Stop时调用）
- `~/.claude/token_cache.json` - Token缓存文件
- `~/.claude/last_refresh_timestamp` - 新增：刷新时间戳文件

**重要:** 用户要求不使用Git，所有操作使用SVN

---

## Task 1: 修改 token_usage_display.py - 添加时间戳管理函数

**文件:** `D:/myProject/GLM-HUD/token_usage_display.py`

**Step 1: 添加时间戳相关常量和函数**

在文件顶部的配置区域（约第24行 `CACHE_TTL = 60` 之后）添加：

```python
# 时间戳文件配置
TIMESTAMP_FILE = os.path.expanduser("~/.claude/last_refresh_timestamp")
REFRESH_INTERVAL = 30  # 刷新间隔（秒）
```

在 `save_cache()` 函数之后（约第103行）添加：

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
    """检查是否需要刷新（距离上次刷新超过REFRESH_INTERVAL秒）"""
    last_time = get_last_refresh_time()
    return time.time() - last_time >= REFRESH_INTERVAL


def update_refresh_timestamp():
    """更新刷新时间戳为当前时间"""
    try:
        os.makedirs(os.path.dirname(TIMESTAMP_FILE), exist_ok=True)
        with open(TIMESTAMP_FILE, 'w') as f:
            f.write(str(int(time.time())))
    except:
        pass
```

**Step 2: 手动验证语法**

运行: `python -m py_compile D:/myProject/GLM-HUD/token_usage_display.py`
预期: 无输出（语法正确）

**Step 3: SVN提交**

```bash
svn commit D:/myProject/GLM-HUD/token_usage_display.py -m "feat: 添加时间戳管理函数"
```

---

## Task 2: 修改 token_usage_display.py - 集成自动刷新逻辑

**文件:** `D:/myProject/GLM-HUD/token_usage_display.py`

**Step 1: 在main函数中集成刷新逻辑**

找到 `main()` 函数中的缓存检查逻辑（约第169-176行），修改如下：

原代码:
```python
    # 检查是否需要更新缓存
    if not cache_full:
        should_update = True
    elif cache_full.get('data', {}).get('token_percent') is None:
        should_update = True
    elif current_time - cache_full.get('updated_at', 0) > CACHE_TTL:
        should_update = True
```

修改为:
```python
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
```

找到 `if should_update:` 块中的保存缓存逻辑（约第178-182行），修改如下：

原代码:
```python
    # 如果需要更新，尝试调用API
    if should_update:
        new_data = query_usage()
        if new_data:
            save_cache(new_data)
            data = new_data
```

修改为:
```python
    # 如果需要更新，尝试调用API
    if should_update:
        new_data = query_usage()
        if new_data:
            save_cache(new_data)
            update_refresh_timestamp()  # 更新刷新时间戳
            data = new_data
```

**Step 2: 手动验证语法**

运行: `python -m py_compile D:/myProject/GLM-HUD/token_usage_display.py`
预期: 无输出（语法正确）

**Step 3: SVN提交**

```bash
svn commit D:/myProject/GLM-HUD/token_usage_display.py -m "feat: 集成30秒自动刷新逻辑"
```

---

## Task 3: 修改 token_update.py - 添加时间戳更新

**文件:** `D:/myProject/GLM-HUD/token_update.py`

**Step 1: 添加时间戳文件常量**

在文件顶部的配置区域（约第24行 `RATE_LIMIT_PAUSE = 600` 之后）添加：

```python
# 时间戳文件配置
TIMESTAMP_FILE = os.path.expanduser("~/.claude/last_refresh_timestamp")
```

**Step 2: 添加时间戳更新函数**

在 `save_cache()` 函数之后（约第103行）添加：

```python
def update_refresh_timestamp():
    """更新刷新时间戳为当前时间"""
    try:
        os.makedirs(os.path.dirname(TIMESTAMP_FILE), exist_ok=True)
        with open(TIMESTAMP_FILE, 'w') as f:
            f.write(str(int(time.time())))
    except:
        pass
```

**Step 3: 在保存缓存成功后调用时间戳更新**

找到成功保存缓存的逻辑（约第147-154行），修改如下：

原代码:
```python
    if usage_data:
        # 成功获取数据，保存到缓存
        save_cache(usage_data, 0)
        try:
            with open(debug_log, 'a', encoding='utf-8') as f:
                f.write(f"  成功更新缓存: {usage_data}\n")
        except:
            pass
```

修改为:
```python
    if usage_data:
        # 成功获取数据，保存到缓存
        save_cache(usage_data, 0)
        update_refresh_timestamp()  # 更新时间戳，重置30秒计时
        try:
            with open(debug_log, 'a', encoding='utf-8') as f:
                f.write(f"  成功更新缓存: {usage_data}\n")
        except:
            pass
```

**Step 4: 手动验证语法**

运行: `python -m py_compile D:/myProject/GLM-HUD/token_update.py`
预期: 无输出（语法正确）

**Step 5: SVN提交**

```bash
svn commit D:/myProject/GLM-HUD/token_update.py -m "feat: Hook刷新时更新时间戳"
```

---

## Task 4: 手动功能测试

**Step 1: 测试时间戳文件不存在时的行为**

删除时间戳文件（如果存在）:
```bash
rm -f ~/.claude/last_refresh_timestamp
```

运行显示脚本:
```bash
python D:/myProject/GLM-HUD/token_usage_display.py
```

预期: 脚本正常执行，调用API刷新（因为无时间戳文件，默认需要刷新）

**Step 2: 测试30秒刷新机制**

运行两次显示脚本，间隔小于30秒:
```bash
python D:/myProject/GLM-HUD/token_usage_display.py
sleep 5
python D:/myProject/GLM-HUD/token_usage_display.py
```

预期: 第一次调用API刷新，第二次直接读取缓存（未到30秒）

**Step 3: 验证时间戳文件内容**

查看时间戳文件:
```bash
cat ~/.claude/last_refresh_timestamp
```

预期: 显示一个Unix时间戳（如：1740979200）

**Step 4: 测试Hook刷新重置计时**

运行Hook更新脚本:
```bash
python ~/.claude/hooks/token_update.py
```

立即运行显示脚本:
```bash
python D:/myProject/GLM-HUD/token_usage_display.py
```

预期: 直接读取缓存（Hook刚刷新过，未到30秒）

---

## Task 5: 重新安装并验证

**Step 1: 运行安装脚本**

```bash
cd D:/myProject/GLM-HUD
python install.py
```

预期: 安装成功，提示重启Claude Code

**Step 2: 验证已安装的脚本**

检查hooks目录中的脚本是否已更新:
```bash
grep -n "should_refresh" ~/.claude/hooks/token_usage_display.py
grep -n "update_refresh_timestamp" ~/.claude/hooks/token_update.py
```

预期: 找到新增的函数

**Step 3: SVN提交安装脚本（如有修改）**

如果install.py有修改:
```bash
svn commit D:/myProject/GLM-HUD/install.py -m "chore: 更新安装说明"
```

---

## Task 6: 文档更新

**文件:** `D:/myProject/GLM-HUD/安装指南.md`

**Step 1: 更新配置说明**

在配置说明部分添加30秒自动刷新的说明：

```markdown
## 配置说明

### 刷新机制
- **SessionStart Hook:** 启动时自动查询 Token 使用情况
- **Stop Hook:** 每次回复结束时自动更新
- **30秒自动刷新:** statusLine每30秒自动调用API更新（如无Hook刷新）
- **Hook刷新重置计时:** Hook刷新后，30秒内statusLine不会重复刷新

### 性能说明
- statusLine每300ms刷新显示（从缓存读取，无API调用）
- 每30秒发起一次GET请求更新缓存（负载极低）
- 同步调用可能导致短暂卡顿（<1秒，可接受）
```

**Step 2: SVN提交**

```bash
svn commit D:/myProject/GLM-HUD/安装指南.md -m "docs: 添加30秒自动刷新机制说明"
```

---

## 验收标准

**功能验收:**
- [ ] 启动cc后，statusLine正常显示Token使用率
- [ ] 等待30秒后，statusLine自动刷新数据
- [ ] Stop Hook触发后，30秒内statusLine不会重复刷新
- [ ] 关闭cc后，无遗留进程

**兼容性验收:**
- [ ] 现有Hook刷新机制正常工作
- [ ] 时间戳文件损坏时不影响功能（默认刷新）
- [ ] API响应慢时不影响cc正常使用

**文档验收:**
- [ ] 代码注释清晰完整
- [ ] 用户文档已更新

---

## 故障排查

**问题:** statusLine一直显示"🔄等待数据..."
**排查:** 检查网络连接和AUTH_TOKEN配置

**问题:** 30秒后没有自动刷新
**排查:** 检查时间戳文件权限和路径

**问题:** Hook刷新后statusLine仍然调用API
**排查:** 检查update_refresh_timestamp()是否被正确调用

---

## 回滚方案

如需回滚，恢复修改前的文件:
```bash
svn revert D:/myProject/GLM-HUD/token_usage_display.py
svn revert D:/myProject/GLM-HUD/token_update.py
python D:/myProject/GLM-HUD/install.py
```
