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

/**
 * Deduplicate thông tin user đăng nhập trên toàn bộ vòng đời của 1 request (React cache).
 * Header, RootLayout, Banner... cùng gọi hàm này trong cùng một request thì DB chỉ chạy ĐÚNG 1 LẦN duy nhất!
 */
export const getCurrentUserData = cache(async (): Promise<CurrentUserSessionData | null> => {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, proUntil: true, balanceVnd: true, balanceUsd: true },
    });
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
