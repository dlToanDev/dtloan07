import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { logCredentialAccess } from '@/lib/shop/account-stock';

const schema = z.object({
  orderItemId: z.string().min(1),
  /** Bắt buộc với khách chưa đăng nhập: mã đơn + email phải khớp. */
  orderCode: z.string().trim().max(64).optional(),
  email: z.string().trim().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = checkRateLimit(`credentials:${ip}`, 10, 60);
    if (!limit.success) {
      return NextResponse.json(
        { error: `Bạn thao tác quá nhanh. Thử lại sau ${limit.resetSeconds} giây.` },
        { status: 429 },
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }
    const { orderItemId, orderCode, email } = parsed.data;

    const item = await db.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        productNameSnapshot: true,
        variantNameSnapshot: true,
        productTypeSnapshot: true,
        deliveredCredentials: true,
        order: { select: { id: true, orderCode: true, email: true, userId: true, status: true } },
        accountStock: {
          where: { status: 'DELIVERED' },
          select: { id: true, credentials: true },
        },
      },
    });

    if (!item || item.productTypeSnapshot !== 'ACCOUNT') {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản của đơn này.' }, { status: 404 });
    }

    // Quyền xem: chủ đơn đã đăng nhập, hoặc khách vãng lai khớp mã đơn + email.
    const session = await auth();
    const sessionEmail = session?.user?.email?.toLowerCase();
    const isOwner =
      (item.order.userId && item.order.userId === session?.user?.id) ||
      (sessionEmail && sessionEmail === item.order.email.toLowerCase()) ||
      session?.user?.role === 'ADMIN';

    const guestCode = orderCode?.startsWith('DH-') ? orderCode : orderCode && `DH-${orderCode}`;
    const guestMatches =
      Boolean(guestCode) &&
      guestCode === item.order.orderCode &&
      Boolean(email) &&
      email!.toLowerCase() === item.order.email.toLowerCase();

    if (!isOwner && !guestMatches) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập hoặc nhập đúng mã đơn và email để xem thông tin này.' },
        { status: 403 },
      );
    }

    if (item.order.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Đơn hàng chưa được thanh toán nên chưa có thông tin tài khoản.' },
        { status: 409 },
      );
    }

    const label = item.variantNameSnapshot
      ? `${item.productNameSnapshot} — ${item.variantNameSnapshot}`
      : item.productNameSnapshot;

    const accounts: { label: string; credentials: string }[] = [];

    try {
      // Bàn giao tự động: mỗi dòng kho là một tài khoản.
      for (const row of item.accountStock) {
        accounts.push({ label, credentials: decryptCredentials(row.credentials) });
        await logCredentialAccess(db, {
          actorUserId: session?.user?.id ?? null,
          actorEmail: item.order.email,
          accountStockId: row.id,
          orderItemId: item.id,
          reason: 'CUSTOMER_VIEW',
        });
      }

      // Bàn giao thủ công: thông tin nằm ngay trên OrderItem.
      if (item.deliveredCredentials) {
        accounts.push({ label, credentials: decryptCredentials(item.deliveredCredentials) });
        await logCredentialAccess(db, {
          actorUserId: session?.user?.id ?? null,
          actorEmail: item.order.email,
          orderItemId: item.id,
          reason: 'CUSTOMER_VIEW',
        });
      }
    } catch (error) {
      console.error('Lỗi giải mã thông tin tài khoản:', error);
      return NextResponse.json(
        { error: 'Không đọc được thông tin tài khoản. Vui lòng liên hệ người bán.' },
        { status: 500 },
      );
    }

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'Tài khoản đang được chuẩn bị, vui lòng quay lại sau.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: { accounts } });
  } catch (error) {
    console.error('Lỗi xem thông tin tài khoản:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra. Vui lòng thử lại.' }, { status: 500 });
  }
}
