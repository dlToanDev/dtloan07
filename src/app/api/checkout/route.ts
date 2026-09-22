import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { calculatePricing, ProductPriceSnapshot } from '@/lib/pricing';
import { createPayOSPaymentLink, generateLicenseKey } from '@/lib/payments/payos';
import { sendOrderLicenseEmail } from '@/lib/mail';
import { siteConfig } from '@/config/site';

const checkoutSchema = z.object({
  email: z.string().email('Địa chỉ email nhận hàng không hợp lệ.'),
  name: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive().default(1),
      }),
    )
    .min(1, 'Giỏ hàng không được để trống.'),
  couponCode: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const json = await req.json().catch(() => ({}));
    const parseResult = checkoutSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Thông tin thanh toán không hợp lệ.' },
        { status: 400 },
      );
    }

    const { email, items, couponCode } = parseResult.data;
    const userId = session?.user?.id;

    // 1. Đọc sản phẩm từ Database
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db.product.findMany({
      where: {
        id: { in: productIds },
        status: 'ACTIVE',
      },
    });

    if (dbProducts.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm hợp lệ trong giỏ hàng.' },
        { status: 400 },
      );
    }

    const productsMap = new Map<string, ProductPriceSnapshot>();
    const productDetails = new Map<string, (typeof dbProducts)[0]>();

    for (const p of dbProducts) {
      productsMap.set(p.id, {
        id: p.id,
        priceVnd: p.priceVnd,
        status: p.status,
      });
      productDetails.set(p.id, p);
    }

    // 2. Tìm coupon nếu có
    let coupon = null;
    if (couponCode && couponCode.trim() !== '') {
      coupon = await db.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
    }

    // 3. Tính toán giá tiền chính xác từ server
    const pricing = calculatePricing({
      items,
      productsMap,
      coupon,
    });

    if (pricing.items.length === 0) {
      return NextResponse.json(
        { error: 'Không có sản phẩm khả dụng để thanh toán.' },
        { status: 400 },
      );
    }

    // 4. Sinh mã đơn hàng số nguyên cho PayOS (PayOS yêu cầu orderCode dạng số nguyên dương)
    // Dùng timestamp (giây) + 2 số ngẫu nhiên để không trùng lặp và không vượt quá Number.MAX_SAFE_INTEGER
    const numericOrderCode = Number(
      `${Math.floor(Date.now() / 1000)}${Math.floor(10 + Math.random() * 90)}`,
    );
    const formattedOrderCode = `DH-${numericOrderCode}`;

    // 5. Nếu đơn hàng 0 VND (Ví dụ miễn phí hoặc giảm 100%): Cấp License ngay lập tức
    if (pricing.totalVnd <= 0) {
      const order = await db.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderCode: formattedOrderCode,
            userId: userId || null,
            email,
            status: 'PAID',
            subtotalVnd: pricing.subtotalVnd,
            discountVnd: pricing.discountVnd,
            totalVnd: 0,
            couponId: coupon?.id || null,
            provider: 'PAYOS',
            paidAt: new Date(),
            items: {
              create: pricing.items.map((item) => {
                const prod = productDetails.get(item.productId);
                return {
                  productId: item.productId,
                  qty: item.qty,
                  unitPriceVnd: item.unitPriceVnd,
                  productNameSnapshot: prod?.name || 'Sản phẩm số',
                };
              }),
            },
          },
          include: { items: true },
        });

        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Tạo License
        const licensesToDeliver = [];
        for (const orderItem of newOrder.items) {
          const prod = productDetails.get(orderItem.productId);
          const licenseKey = generateLicenseKey();
          const license = await tx.license.create({
            data: {
              key: licenseKey,
              userId: userId || null,
              email,
              orderItemId: orderItem.id,
              productId: orderItem.productId,
              maxDownloads: prod?.maxDownloads || 5,
            },
          });

          licensesToDeliver.push({
            productName: orderItem.productNameSnapshot,
            licenseKey: license.key,
            downloadUrl: `${siteConfig.url}/api/download/${license.id}`,
          });
        }

        return { newOrder, licensesToDeliver };
      });

      // Gửi email xác nhận kèm License
      await sendOrderLicenseEmail({
        to: email,
        orderCode: formattedOrderCode,
        licenses: order.licensesToDeliver,
      }).catch((e) => console.error('Lỗi gửi mail đơn hàng miễn phí:', e));

      return NextResponse.json({
        success: true,
        orderCode: formattedOrderCode,
        checkoutUrl: `${siteConfig.url}/checkout/success?orderCode=${numericOrderCode}`,
        isFree: true,
      });
    }

    // 6. Tạo đơn hàng PENDING trong Database
    await db.order.create({
      data: {
        orderCode: formattedOrderCode,
        userId: userId || null,
        email,
        status: 'PENDING',
        subtotalVnd: pricing.subtotalVnd,
        discountVnd: pricing.discountVnd,
        totalVnd: pricing.totalVnd,
        couponId: coupon?.id || null,
        provider: 'PAYOS',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Hết hạn sau 24h
        items: {
          create: pricing.items.map((item) => {
            const prod = productDetails.get(item.productId);
            return {
              productId: item.productId,
              qty: item.qty,
              unitPriceVnd: item.unitPriceVnd,
              productNameSnapshot: prod?.name || 'Sản phẩm số',
            };
          }),
        },
      },
    });

    // 7. Gọi PayOS tạo Payment Link thanh toán VietQR
    const payosResult = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: pricing.totalVnd,
      description: formattedOrderCode,
      items: pricing.items.map((item) => {
        const prod = productDetails.get(item.productId);
        return {
          name: (prod?.name || 'Sản phẩm số').slice(0, 50),
          quantity: item.qty,
          price: item.unitPriceVnd,
        };
      }),
    });

    return NextResponse.json({
      success: true,
      orderCode: formattedOrderCode,
      checkoutUrl: payosResult.checkoutUrl,
      qrCode: payosResult.qrCode,
      isMock: payosResult.isMock,
    });
  } catch (error) {
    console.error('❌ Lỗi tạo đơn hàng thanh toán:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi khởi tạo thanh toán. Vui lòng thử lại sau.' },
      { status: 500 },
    );
  }
}
