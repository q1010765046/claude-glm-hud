/**
 * stdin JSON 解析
 * 带超时保护，防止 Claude Code 异常未关闭管道时进程永久挂起
 */

import { StdinData } from './types.js';

// stdin 读取超时：3 秒
const STDIN_TIMEOUT_MS = 3_000;

/**
 * 从 stdin 读取 JSON 数据
 */
export function readStdin(): Promise<StdinData> {
  return new Promise<StdinData>((resolve) => {
    const chunks: Buffer[] = [];

    // 超时保护：超过时限直接返回空对象
    const timer = setTimeout(() => {
      resolve({});
    }, STDIN_TIMEOUT_MS);

    // stdin 数据读取
    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
    };

    const onEnd = () => {
      clearTimeout(timer);
      const raw = Buffer.concat(chunks).toString('utf-8').trim();

      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw) as StdinData);
      } catch {
        resolve({});
      }
    };

    process.stdin.on('data', onData);
    process.stdin.on('end', onEnd);

    // 如果 stdin 已经结束（非管道模式），立即解析
    if (process.stdin.isTTY) {
      clearTimeout(timer);
      resolve({});
    }
  });
}
