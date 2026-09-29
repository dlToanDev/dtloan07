import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { isPro, proDaysLeft } from '@/lib/membership';
import { ProfileManager } from '@/components/account/profile-manager';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hồ sơ tài khoản & Gói PRO',
  description: 'Quản lý thông tin cá nhân, nâng cấp tài khoản PRO, xem đơn hàng và bài viết của bạn.',
};

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; order?: string; cancelled?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId || !userEmail) {
    redirect('/login?callbackUrl=/account');
  }

  const { tab, order: orderCode, cancelled } = await searchParams;

  // 1. Lấy thông tin user trước
  const userDb = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      proUntil: true,
      createdAt: true,
      password: true,
      age: true,
      address: true,
      education: true,
      bio: true,
      balanceVnd: true,
      balanceUsd: true,
    },
  });

  if (!userDb) {
    redirect('/login?callbackUrl=/account');
  }

  // 2. Lấy dữ liệu liên quan song song với giới hạn tải hợp lý
  const [warnings, licenses, orders, grants, posts, walletTransactions] = await Promise.all([
    db.userWarning.findMany({
      where: { userId },
      select: { id: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.license.findMany({
      where: {
        OR: [{ userId }, { email: userEmail }],
      },
      include: {
        product: {
          select: {
            name: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    db.order.findMany({
      where: {
        OR: [{ userId }, { email: userEmail }],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    db.couponGrant.findMany({
      where: { userId },
      include: {
        coupon: {
          include: {
            categories: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    db.communityPost.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        removedReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    db.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  const pro = isPro(userDb);
  const daysLeft = proDaysLeft(userDb.proUntil ?? null);

  const signOutAction = async () => {
    'use server';
    await signOut({ redirectTo: '/' });
  };

  return (
    <ProfileManager
      user={{
        id: userDb.id,
        email: userDb.email,
        name: userDb.name,
        image: userDb.image,
        role: String(userDb.role),
        proUntil: userDb.proUntil,
        createdAt: userDb.createdAt,
        hasPassword: Boolean(userDb.password),
        age: userDb.age,
        address: userDb.address,
        education: userDb.education,
        bio: userDb.bio,
      }}
      pro={pro}
      daysLeft={daysLeft}
      warnings={warnings}
      licenses={licenses}
      orders={orders}
      grants={grants}
      posts={posts}
      wallet={{
        balanceVnd: userDb.balanceVnd,
        balanceUsd: userDb.balanceUsd,
        transactions: walletTransactions,
      }}
      initialTab={tab || (orderCode || cancelled ? (tab || 'pro') : 'profile')}
      orderCode={orderCode}
      cancelled={Boolean(cancelled)}
      signOutAction={signOutAction}
    />
  );
}
