import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Route chuyển hướng nội bộ & theo dõi lượt click cho Affiliate Deals:
 * GET /go/[slug]
 *
 * - Tăng clickCount lên 1
 * - Tự động chọn link (Direct URL hoặc Shortened Monetized URL) theo cấu hình
 * - Trả về 307 Temporary Redirect và chặn bot search engine index
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.redirect(new URL('/affiliate', request.url));
  }

  const deal = await db.affiliateItem.findUnique({
    where: { slug, active: true },
    select: {
      id: true,
      directUrl: true,
      shortenedUrl: true,
      activeUrlType: true,
    },
  });

  if (!deal) {
    return NextResponse.redirect(new URL('/affiliate', request.url));
  }

  // Tăng lượt click trong nền (không chặn người dùng nếu mạng chậm)
  try {
    await db.affiliateItem.update({
      where: { id: deal.id },
      data: { clickCount: { increment: 1 } },
    });
  } catch (err) {
    console.error(`Lỗi cập nhật click count cho deal ${slug}:`, err);
  }

  // Xác định link đích
  let targetUrl = deal.directUrl;
  if (deal.activeUrlType === 'SHORTENED' && deal.shortenedUrl && deal.shortenedUrl.trim() !== '') {
    targetUrl = deal.shortenedUrl;
  }

  const response = NextResponse.redirect(targetUrl, 307);
  // Bảo vệ SEO: không cho Google index link redirect
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
}
