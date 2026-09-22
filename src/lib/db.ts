import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient để tránh connection pool exhaustion
 * do Next.js hot-reloading trong môi trường development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Luôn lưu singleton trên globalThis để tái sử dụng connection pool
globalForPrisma.prisma = db;
