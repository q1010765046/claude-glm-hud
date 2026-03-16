/**
 * stdin JSON 解析
 */

import { StdinData } from './types.js';

/**
 * 从 stdin 读取 JSON 数据
 */
export async function readStdin(): Promise<StdinData> {
  const chunks: Buffer[] = [];

  try {
    // 读取所有 stdin 数据
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf-8').trim();

    // 空输入返回空对象
    if (!raw) {
      return {};
    }

    // 解析 JSON
    return JSON.parse(raw) as StdinData;
  } catch (error) {
    // 解析失败返回空对象
    return {};
  }
}
