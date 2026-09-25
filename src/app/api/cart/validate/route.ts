import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calculatePricing, ProductPriceSnapshot } from '@/lib/pricing';

const validateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().positive().default(1),
    }),
  ),
  couponCode: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = validateCartSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Dữ liệu giỏ hàng không hợp lệ.' },
        { status: 400 },
      );
    }

    const { items, couponCode } = parseResult.data;

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          subtotalVnd: 0,
          discountVnd: 0,
          totalVnd: 0,
          couponApplied: null,
        },
      });
    }

    // 1. Đọc giá và dữ liệu thực tế từ Database
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db.product.findMany({
      where: {
        id: { in: productIds },
        status: 'ACTIVE',
        saleMode: 'PAID',
      },
    });

    // 2. Tạo map snapshot giá cho pricing calculator
    const productsMap = new Map<string, ProductPriceSnapshot>();
    const productDetailMap = new Map<string, (typeof dbProducts)[0]>();

    for (const p of dbProducts) {
      productsMap.set(p.id, {
        id: p.id,
        priceVnd: p.priceVnd,
        status: p.status,
      });
      productDetailMap.set(p.id, p);
    }

    // 3. Tìm coupon nếu có
    let coupon = null;
    if (couponCode && couponCode.trim() !== '') {
      coupon = await db.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
    }

    // 4. Tính toán giá tiền từ server
    const pricing = calculatePricing({
      items,
      productsMap,
      coupon,
    });

    // 5. Bổ sung thông tin hiển thị cho client
    const detailedItems = pricing.items.map((item) => {
      const p = productDetailMap.get(item.productId);
      return {
        ...item,
        name: p?.name ?? 'Sản phẩm',
        slug: p?.slug ?? '',
        coverUrl: p?.coverUrl ?? '',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        items: detailedItems,
        subtotalVnd: pricing.subtotalVnd,
        discountVnd: pricing.discountVnd,
        totalVnd: pricing.totalVnd,
        couponApplied: pricing.couponApplied,
        couponError: pricing.couponError,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi xác thực giỏ hàng:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi tính giá giỏ hàng. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
