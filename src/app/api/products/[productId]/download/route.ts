import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSignedDownloadUrl, isR2Configured } from '@/lib/storage';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(`free-download:${ip}`, 20, 60).success) {
    return NextResponse.json({ error: 'Vui lòng thử lại sau một phút.' }, { status: 429 });
  }
  try {
    const { productId } = await params;
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { files: true },
    });
    if (
      !product ||
      product.status !== 'ACTIVE' ||
      product.saleMode !== 'FREE' ||
      product.priceVnd !== 0
    ) {
      return NextResponse.json({ error: 'Sản phẩm không cho phép tải miễn phí.' }, { status: 403 });
    }
    const fileId = req.nextUrl.searchParams.get('fileId');
    const file = fileId ? product.files.find((item) => item.id === fileId) : product.files[0];
    if (!file) return NextResponse.json({ error: 'Chưa có tệp để tải.' }, { status: 404 });
    if (!isR2Configured)
      return NextResponse.json({ error: 'Kho tải file chưa được cấu hình.' }, { status: 503 });
    const url = await getSignedDownloadUrl({
      storageKey: file.storageKey,
      filename: file.filename || `${product.slug}.zip`,
    });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Free download failed:', error);
    return NextResponse.json(
      { error: 'Không thể tạo liên kết tải. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
