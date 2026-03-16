#!/usr/bin/env tsx
/**
 * 构建脚本
 * 使用 esbuild 编译 TypeScript 代码
 */

import { build } from 'esbuild';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

async function main() {
  // 确保输出目录存在
  if (!existsSync('dist')) {
    await mkdir('dist', { recursive: true });
  }

  // 编译入口文件
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/index.js',
    sourcemap: true,
    minify: false,
    external: [],
  });

  console.log('[构建成功] dist/index.js');
}

main().catch((err) => {
  console.error('[构建失败]', err);
  process.exit(1);
});
