import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/shop/checkout-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán đơn hàng',
  description: 'Thanh toán đơn hàng nhanh chóng, an toàn qua PayOS hoặc COD.',
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/checkout');
  }

  return (
    <CheckoutForm initialEmail={session.user.email ?? ''} initialName={session.user.name ?? ''} />
  );
}
