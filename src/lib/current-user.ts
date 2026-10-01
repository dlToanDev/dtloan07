import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isPro } from '@/lib/membership';
import { cache } from 'react';

export interface CurrentUserSessionData {
  id: string;
  role: string;
  proUntil: Date | null;
  isPro: boolean;
  balanceVnd: number;
  balanceUsd: number;
}

import { unstable_cache } from 'next/cache';

const getCachedDbUser = (userId: string) =>
  unstable_cache(
    async () => {
      return db.user.findUnique({
        where: { id: userId },
        select: { role: true, proUntil: true, balanceVnd: true, balanceUsd: true },
      });
    },
    [`user-session-data-${userId}`],
    { revalidate: 30, tags: ['user', `user-${userId}`] },
  )();

/**
 * Deduplicate thông tin user đăng nhập trên toàn bộ vòng đời của 1 request (React cache),
 * đồng thời lưu cache bộ nhớ 30s (Next.js unstable_cache) để không truy vấn DB Supabase
 * ở mỗi lần người dùng bấm chuyển trang.
 */
export const getCurrentUserData = cache(async (): Promise<CurrentUserSessionData | null> => {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await getCachedDbUser(session.user.id);
    if (!user) return null;

    const userIsPro = user.role === 'ADMIN' || isPro(user);
    return {
      id: session.user.id,
      role: user.role,
      proUntil: user.proUntil,
      isPro: userIsPro,
      balanceVnd: user.balanceVnd,
      balanceUsd: user.balanceUsd,
    };
  } catch {
    return null;
  }
});
