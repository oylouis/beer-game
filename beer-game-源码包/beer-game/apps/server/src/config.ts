import 'dotenv/config';

function num(v: string | undefined, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export const config = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  roomCodeLength: num(process.env.ROOM_CODE_LENGTH, 6),
  requireDb: process.env.REQUIRE_DB !== 'false',
};

/** 若存在数据库配置则返回，否则 null（用于内存回退 / 健康检查） */
export function hasDatabase(): boolean {
  return !!config.databaseUrl && config.requireDb;
}