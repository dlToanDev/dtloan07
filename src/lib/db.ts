import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient để tránh connection pool exhaustion
 * do Next.js hot-reloading trong môi trường development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSafeDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Khắc phục triệt để lỗi "Timed out fetching a new connection from the connection pool"
  // Đảm bảo pool có tối thiểu 10 connections và timeout 30s khi chạy nhiều truy vấn song song
  if (url.includes('connection_limit=1&') || url.endsWith('connection_limit=1')) {
    url = url.replace(/connection_limit=1(?=&|$)/, 'connection_limit=10');
  }
  if (!url.includes('pool_timeout=')) {
    url += (url.includes('?') ? '&' : '?') + 'pool_timeout=30';
  }
  return url;
}

const safeUrl = getSafeDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: safeUrl ? { db: { url: safeUrl } } : undefined,
    log: process.env.DEBUG_PRISMA === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

// Luôn lưu singleton trên globalThis để tái sử dụng connection pool
globalForPrisma.prisma = db;
