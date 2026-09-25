import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPayOSSignature, payosClient, generateLicenseKey } from '@/lib/payments/payos';
import { sendAdminManualDeliveryEmail, sendOrderLicenseEmail } from '@/lib/mail';
import { deliverAutoAccounts } from '@/lib/shop/account-delivery';
import { siteConfig } from '@/config/site';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);

    if (!rawBody || !rawBody.data) {
      return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
    }

    const { data, signature } = rawBody;

    // 1. Xác thực chữ ký HMAC SHA256 (bắt buộc trước khi xử lý bất kỳ dữ liệu nào)
    let isSignatureValid = false;

    if (payosClient) {
      try {
        const verifiedData = await payosClient.webhooks.verify(rawBody);
        if (verifiedData) {
          isSignatureValid = true;
        }
      } catch (err) {
        console.warn('Lỗi verify qua PayOS SDK, đối soát qua HMAC dự phòng:', err);
      }
    }

    // Đối soát dự phòng bằng hàm HMAC timing-safe
    if (!isSignatureValid && signature) {
      isSignatureValid = verifyPayOSSignature(data, signature);
    }

    // Nếu môi trường dev chưa cấu hình key thì cho phép test mock với header x-mock-test
    const isMockTest =
      process.env.NODE_ENV !== 'production' && req.headers.get('x-mock-test') === 'true';

    if (!isSignatureValid && !isMockTest) {
      console.error('🚨 CẢNH BÁO: Chữ ký Webhook PayOS không hợp lệ! Bị từ chối.');
      return NextResponse.json({ error: 'Chữ ký không hợp lệ' }, { status: 400 });
    }

    const numericOrderCode = data.orderCode;
    const paymentAmount = data.amount;
    const formattedOrderCode = `DH-${numericOrderCode}`;

    // 2. Idempotency check: khoá chống xử lý lặp
    const providerEventId =
      data.paymentLinkId || data.reference || `payos-${numericOrderCode}-${paymentAmount}`;

    const existingPayment = await db.payment.findUnique({
      where: { providerEventId },
    });

    if (existingPayment) {
      console.log(`ℹ️ Webhook ${providerEventId} đã được xử lý trước đó. Bỏ qua.`);
      return NextResponse.json({ success: true, message: 'Đã xử lý trước đó (idempotent)' });
    }

    // 3. Tìm đơn hàng tương ứng
    const order = await db.order.findUnique({
      where: { orderCode: formattedOrderCode },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      console.error(`❌ Không tìm thấy đơn hàng tương ứng: ${formattedOrderCode}`);
      return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 });
    }

    // Nếu đơn hàng đã thanh toán trước đó
    if (order.status === 'PAID') {
      return NextResponse.json({ success: true, message: 'Đơn hàng đã được thanh toán.' });
    }

    // 4. ĐỐI CHIẾU SỐ TIỀN: Tuyệt đối không cấp hàng nếu số tiền thanh toán không khớp
    if (paymentAmount !== order.totalVnd) {
      console.error(
        `🚨 CẢNH BÁO GIAN LẬN: Số tiền thanh toán (${paymentAmount}) không khớp với đơn hàng ${order.orderCode} (${order.totalVnd})!`,
      );
      return NextResponse.json(
        { error: 'Số tiền thanh toán không khớp với đơn hàng' },
        { status: 400 },
      );
    }

    // Trạng thái giao hàng sau khi thanh toán:
    // - có hàng vật lý → CONFIRMED để admin đóng gói
    // - có tài khoản bàn giao thủ công → giữ PENDING chờ admin gửi
    // - chỉ còn tài khoản tự động / file tải về → DELIVERED ngay
    const hasPhysical = order.items.some((item) => item.productTypeSnapshot === 'PHYSICAL');
    const manualAccountItems = order.items.filter(
      (item) => item.productTypeSnapshot === 'ACCOUNT' && item.product.deliveryMode === 'MANUAL',
    );
    const hasAutoAccount = order.items.some(
      (item) => item.productTypeSnapshot === 'ACCOUNT' && item.product.deliveryMode === 'AUTO',
    );

    const nextFulfillment = hasPhysical
      ? ('CONFIRMED' as const)
      : manualAccountItems.length > 0
        ? ('PENDING' as const)
        : order.fulfillmentStatus
          ? ('DELIVERED' as const)
          : null;

    // 5. Giao dịch Database đồng nhất: Cập nhật Order, Payment, License và Coupon
    const result = await db.$transaction(async (tx) => {
      // a. Cập nhật Order -> PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          fulfillmentStatus: nextFulfillment,
        },
      });

      // b. Ghi nhận giao dịch Payment
      await tx.payment.create({
        data: {
          orderId: order.id,
          providerEventId,
          providerTxnId: data.reference || null,
          amountVnd: paymentAmount,
          rawPayload: rawBody,
          signatureValid: true,
        },
      });

      // c. Tăng lượt dùng coupon nếu có
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: {
            usedCount: { increment: 1 },
          },
        });
      }

      // d. Cấp mã bản quyền (License) cho từng OrderItem
      const createdLicenses = [];

      for (const item of order.items) {
        // Chỉ hàng file tải về mới có license; hàng vật lý được giao thủ công.
        if (item.productTypeSnapshot !== 'DOWNLOAD') continue;

        // Kiểm tra xem đã có license cho item này chưa (1-1)
        const existingLicense = await tx.license.findUnique({
          where: { orderItemId: item.id },
        });

        if (!existingLicense) {
          const newLicense = await tx.license.create({
            data: {
              key: generateLicenseKey(),
              userId: order.userId,
              email: order.email,
              orderItemId: item.id,
              productId: item.productId,
              maxDownloads: item.product.maxDownloads || 5,
            },
          });

          createdLicenses.push({
            productName: item.productNameSnapshot,
            licenseKey: newLicense.key,
            downloadUrl: `${siteConfig.url}/api/download/${newLicense.id}`,
          });
        }
      }

      return { updatedOrder, createdLicenses };
    });

    // 6a. Bàn giao tài khoản số tự động (mã hóa → giải mã → email, có ghi log)
    if (hasAutoAccount) {
      await deliverAutoAccounts({
        id: order.id,
        orderCode: order.orderCode,
        email: order.email,
        userId: order.userId,
      }).catch((err) => console.error('Lỗi bàn giao tài khoản tự động:', err));
    }

    // 6b. Tài khoản bàn giao thủ công: báo admin xử lý
    if (manualAccountItems.length > 0) {
      await sendAdminManualDeliveryEmail({
        orderCode: order.orderCode,
        items: manualAccountItems.map((item) =>
          item.variantNameSnapshot
            ? `${item.productNameSnapshot} — ${item.variantNameSnapshot} × ${item.qty}`
            : `${item.productNameSnapshot} × ${item.qty}`,
        ),
      }).catch((err) => console.error('Lỗi gửi mail báo admin bàn giao thủ công:', err));
    }

    // 6. Gửi email bàn giao bản quyền tự động
    if (result.createdLicenses.length > 0) {
      await sendOrderLicenseEmail({
        to: order.email,
        orderCode: order.orderCode,
        licenses: result.createdLicenses,
      }).catch((mailError) => {
        console.error('Lỗi khi gửi email bàn giao bản quyền:', mailError);
      });
    }

    console.log(
      `✅ [PAYOS WEBHOOK] Đơn hàng ${order.orderCode} đã kích hoạt PAID và cấp bản quyền thành công!`,
    );

    return NextResponse.json({ success: true, message: 'Kích hoạt đơn hàng thành công' });
  } catch (error) {
    console.error('❌ Lỗi xử lý PayOS Webhook:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ trong quá trình xử lý Webhook' },
      { status: 500 },
    );
  }
}
