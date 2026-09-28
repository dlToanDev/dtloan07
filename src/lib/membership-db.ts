import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { isPro } from '@/lib/membership';

/**
 * Cộng `days` ngày Pro cho tài khoản (còn hạn thì cộng dồn), cùng luật với `extendProUntil`.
 * Một câu UPDATE nên hai lần thanh toán cùng lúc không ghi đè nhau.
 */
export async function grantProDays(tx: Prisma.TransactionClient, userId: string, days: number) {
  await tx.$executeRaw`
    UPDATE "User"
    SET "proUntil" = GREATEST(COALESCE("proUntil", NOW() AT TIME ZONE 'UTC'), NOW() AT TIME ZONE 'UTC')
      + make_interval(days => ${days}::int)
    WHERE "id" = ${userId}
  `;
}

/** Đọc trạng thái Pro mới nhất từ DB (session JWT không mang hạn Pro). */
export async function isUserPro(userId: string | null | undefined) {
  if (!userId) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { proUntil: true } });
  return isPro(user);
}
