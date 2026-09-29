import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { PRO_PLANS } from '@/lib/membership';
import { createPayOSPaymentLink } from '@/lib/payments/payos';
import { siteConfig } from '@/config/site';

/** Link thanh toán gói Pro còn hiệu lực 30 phút; cron hết hạn dọn đơn bỏ dở. */
const PRO_ORDER_TTL_MS = 30 * 60 * 1000;

const schema = z.object({ plan: z.enum(['PRO_MONTH', 'PRO_YEAR']) });

/**
 * Tạo đơn mua gói Pro và link PayOS. Giá lấy từ PRO_PLANS phía server, không tin client.
 * Webhook PayOS cộng hạn Pro khi đơn được thanh toán.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId)
      return NextResponse.json({ error: 'Vui lòng đăng nhập để mua gói Pro.' }, { status: 401 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json({ error: 'Gói Pro không hợp lệ.' }, { status: 400 });
    const plan = PRO_PLANS[parsed.data.plan];

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });

    const numericOrderCode = Number(
      `${Math.floor(Date.now() / 1000)}${Math.floor(10 + Math.random() * 90)}`,
    );
    const orderCode = `DH-${numericOrderCode}`;

    await db.order.create({
      data: {
        orderCode,
        userId,
        email: user.email,
        customerName: user.name,
        status: 'PENDING',
        subtotalVnd: plan.priceVnd,
        totalVnd: plan.priceVnd,
        provider: 'PAYOS',
        paymentMethod: 'PAYOS',
        membershipPlan: parsed.data.plan,
        expiresAt: new Date(Date.now() + PRO_ORDER_TTL_MS),
      },
    });

    const payos = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: plan.priceVnd,
      description: orderCode,
      items: [{ name: plan.label, quantity: 1, price: plan.priceVnd }],
      returnUrl: `${siteConfig.url}/account?tab=pro&order=${orderCode}`,
      cancelUrl: `${siteConfig.url}/account?tab=pro&cancelled=1`,
    });

    return NextResponse.json({ success: true, orderCode, checkoutUrl: payos.checkoutUrl });
  } catch (error) {
    console.error('❌ Lỗi tạo đơn gói Pro:', error);
    return NextResponse.json(
      { error: 'Không tạo được thanh toán. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
