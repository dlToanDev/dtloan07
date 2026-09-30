import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { siteConfig } from '@/config/site';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/subscribe/status?status=invalid', siteConfig.url));
  }

  try {
    const subscriber = await db.subscriber.findUnique({
      where: { confirmToken: token },
    });

    if (!subscriber) {
      return NextResponse.redirect(new URL('/subscribe/status?status=not-found', siteConfig.url));
    }

    if (subscriber.status !== 'CONFIRMED') {
      await db.subscriber.update({
        where: { id: subscriber.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });
    }

    // Chuyển hướng tới trang thông báo thành công kèm nguồn tải tài liệu
    const redirectUrl = new URL('/subscribe/status', siteConfig.url);
    redirectUrl.searchParams.set('status', 'success');
    if (subscriber.source) {
      redirectUrl.searchParams.set('source', subscriber.source);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Lỗi xác nhận subscription:', error);
    return NextResponse.redirect(new URL('/subscribe/status?status=error', siteConfig.url));
  }
}
