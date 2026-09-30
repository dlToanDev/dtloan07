import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nâng cấp tài khoản PRO',
  description: 'Nâng cấp tài khoản Pro: đăng bài viết, luôn miễn phí ship và nhận voucher bí mật.',
};

export const dynamic = 'force-dynamic';

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; cancelled?: string }>;
}) {
  const session = await auth();
  const { order, cancelled } = await searchParams;

  const query = new URLSearchParams();
  query.set('tab', 'pro');
  if (order) query.set('order', order);
  if (cancelled) query.set('cancelled', cancelled);

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/account?${query.toString()}`)}`);
  }

  redirect(`/account?${query.toString()}`);
}
