/**
 * HTTP 连接复用 + 公共重试逻辑
 * 使用 Node.js 内置 https.Agent 的 keepAlive 机制复用 TLS 连接
 * 避免每次请求都重新握手，降低 ECONNRESET 失败率
 */

import https from 'https';

// 全局 keepAlive Agent：守护进程整个生命周期复用同一组 TCP/TLS 连接
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,   // 每 30 秒发送 TCP keepalive 探测
  maxSockets: 5,             // 每个主机最多 5 个并发连接
  timeout: 8_000,            // 连接超时 8 秒
});

/**
 * 带连接复用的 HTTPS GET 请求
 * 返回响应体文本，失败时抛异常（由调用方重试）
 */
export function httpsGet(
  url: string,
  headers: Record<string, string>,
  timeout = 8_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, agent: keepAliveAgent }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error('请求超时'));
    });
  });
}

/**
 * 指数退避重试封装
 * 重试间隔: 1s → 2s → 4s
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T | null> {
  const retryDelays = [1000, 2000, 4000];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch {
      if (attempt === maxRetries) {
        return null;
      }
      await new Promise(r => setTimeout(r, retryDelays[attempt - 1]));
    }
  }

  return null;
}
