import { PrismaClient } from '@prisma/client';
import { hasDatabase } from './config.js';

/** 惰性创建，避免无数据库（内存模式）时初始化 @prisma/client 报错 */
let prismaClient: PrismaClient | null = null;

export function prisma(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

export async function ensureDbConnected(): Promise<boolean> {
  if (!hasDatabase()) {
    console.warn('[db] 未配置 DATABASE_URL，运行在内存模式（快照持久化禁用）');
    return false;
  }
  try {
    await prisma().$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    console.error('[db] 连接失败', (e as Error).message);
    return false;
  }
}