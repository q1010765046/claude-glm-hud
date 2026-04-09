/**
 * 守护进程管理器
 * 负责：启动/检测守护进程、心跳维护
 */

import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { CACHE_DIR, DAEMON_PID_FILE, HEARTBEAT_FILE } from './constants.js';

/**
 * 获取守护进程 PID 文件路径
 */
function getPidFilePath(): string {
  return join(homedir(), CACHE_DIR, DAEMON_PID_FILE);
}

/**
 * 获取心跳文件路径
 */
function getHeartbeatPath(): string {
  return join(homedir(), CACHE_DIR, HEARTBEAT_FILE);
}

/**
 * 检测进程是否存活
 */
function isProcessAlive(pid: number): boolean {
  try {
    // signal 0 不发送信号，只检测进程是否存在
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取 PID 文件
 */
function readPidFile(): number | null {
  const path = getPidFilePath();
  if (!existsSync(path)) return null;
  try {
    const pid = parseInt(readFileSync(path, 'utf-8').trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * 写入 PID 文件
 */
function writePidFile(pid: number): void {
  const path = getPidFilePath();
  writeFileSync(path, String(pid), 'utf-8');
}

/**
 * 删除 PID 文件
 */
function removePidFile(): void {
  const path = getPidFilePath();
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // 静默失败
  }
}

/**
 * 启动守护进程（后台 detached 模式）
 */
function startDaemon(): void {
  // 使用当前 node 可执行文件和当前脚本路径
  const nodePath = process.execPath;
  const scriptPath = process.argv[1];

  const child = spawn(nodePath, [scriptPath, '--daemon'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  child.unref();

  // 等待一小段时间让守护进程初始化并写入 PID 文件
  // 不阻塞，下次 statusLine 触发时会再次检查
}

/**
 * 确保守护进程正在运行
 * 如果没有运行则启动一个新的
 */
export function ensureDaemonRunning(): void {
  const pid = readPidFile();

  if (pid !== null && isProcessAlive(pid)) {
    // 守护进程已在运行
    return;
  }

  // PID 文件过期或不存在，清理后启动新守护进程
  removePidFile();
  startDaemon();
}

/**
 * 更新心跳时间戳
 */
export function updateHeartbeat(): void {
  const path = getHeartbeatPath();
  try {
    writeFileSync(path, String(Date.now()), 'utf-8');
  } catch {
    // 静默失败
  }
}

// 导出供 daemon.ts 使用
export { readPidFile, writePidFile, removePidFile, getHeartbeatPath, isProcessAlive };
