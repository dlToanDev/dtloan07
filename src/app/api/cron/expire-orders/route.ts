import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Endpoint chạy định kỳ (Cron Job) huỷ các đơn hàng PENDING quá 24h hoặc đã quá hạn expiresAt
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

    const result = await db.order.updateMany({
      where: {
        status: 'PENDING',
        OR: [{ expiresAt: { lte: now } }, { createdAt: { lte: threshold24hAgo } }],
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return NextResponse.json({
      success: true,
      expiredCount: result.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Lỗi khi huỷ đơn hàng quá hạn:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý đơn quá hạn.' }, { status: 500 });
  }
}
