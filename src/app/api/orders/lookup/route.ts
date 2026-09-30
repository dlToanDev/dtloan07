import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const lookupSchema = z.object({
  orderCode: z.string().min(3, 'Vui lòng nhập mã đơn hàng.'),
  email: z.string().email('Địa chỉ email không hợp lệ.'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = lookupSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Thông tin tra cứu không hợp lệ.' },
        { status: 400 },
      );
    }

    const { orderCode, email } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();
    const formattedCode = orderCode.trim().startsWith('DH-')
      ? orderCode.trim()
      : `DH-${orderCode.trim()}`;

    const order = await db.order.findFirst({
      where: {
        orderCode: formattedCode,
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
      include: {
        coupon: true,
        items: {
          include: {
            license: true,
            product: {
              select: {
                name: true,
                slug: true,
                version: true,
                maxDownloads: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          error:
            'Không tìm thấy đơn hàng nào khớp với mã đơn và email đã cung cấp. Vui lòng kiểm tra lại.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderCode: order.orderCode,
        email: order.email,
        status: order.status,
        subtotalVnd: order.subtotalVnd,
        discountVnd: order.discountVnd,
        totalVnd: order.totalVnd,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productNameSnapshot,
          variantName: item.variantNameSnapshot,
          productType: item.productTypeSnapshot,
          qty: item.qty,
          unitPriceVnd: item.unitPriceVnd,
          license: item.license
            ? {
                id: item.license.id,
                key: item.license.key,
                downloadCount: item.license.downloadCount,
                maxDownloads: item.license.maxDownloads,
                remainingDownloads: Math.max(
                  0,
                  item.license.maxDownloads - item.license.downloadCount,
                ),
                isRevoked: Boolean(item.license.revokedAt),
                downloadUrl: `/api/download/${item.license.id}?key=${encodeURIComponent(item.license.key)}&email=${encodeURIComponent(order.email)}`,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error('Lỗi tra cứu đơn hàng:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi tra cứu. Vui lòng thử lại sau.' },
      { status: 500 },
    );
  }
}
