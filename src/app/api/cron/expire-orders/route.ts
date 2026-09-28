import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { releaseOrderInventory } from '@/lib/shop/inventory';
import { releaseAccountsForOrder } from '@/lib/shop/account-stock';
import { releaseCouponForOrder } from '@/lib/coupons';

export const dynamic = 'force-dynamic';

/**
 * Endpoint chạy định kỳ (Cron Job) huỷ các đơn hàng PENDING quá 24h hoặc đã quá hạn expiresAt,
 * đồng thời trả lại tồn kho đã giữ chỗ cho biến thể.
 * Bảo vệ bằng Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Nếu có cấu hình CRON_SECRET thì kiểm tra xác thực
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
    }

    const now = new Date();
    const threshold24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Đơn COD có expiresAt = null và không tự hết hạn — admin tự hủy nếu khách bỏ đơn.
    const expiring = await db.order.findMany({
      where: {
        status: 'PENDING',
        paymentMethod: 'PAYOS',
        OR: [{ expiresAt: { lte: now } }, { expiresAt: null, createdAt: { lte: threshold24hAgo } }],
      },
      select: { id: true },
    });

    let expiredCount = 0;
    for (const order of expiring) {
      // Mỗi đơn một transaction: một đơn lỗi không chặn các đơn còn lại.
      await db
        .$transaction(async (tx) => {
          // Khóa theo điều kiện status để không trả kho hai lần khi cron chạy chồng.
          const updated = await tx.order.updateMany({
            where: { id: order.id, status: 'PENDING' },
            data: { status: 'EXPIRED', fulfillmentStatus: null, cancelledAt: now },
          });
          if (updated.count === 0) return;
          await releaseOrderInventory(tx, order.id);
          await releaseAccountsForOrder(tx, order.id);
          await releaseCouponForOrder(tx, order.id);
          expiredCount += 1;
        })
        .catch((err) => console.error(`Lỗi hủy đơn quá hạn ${order.id}:`, err));
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Lỗi khi huỷ đơn hàng quá hạn:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý đơn quá hạn.' }, { status: 500 });
  }
}
