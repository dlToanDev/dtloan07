import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendLeadMagnetConfirmEmail } from '@/lib/mail';
import { siteConfig } from '@/config/site';

const subscribeSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ'),
  source: z.string().min(1).default('general-newsletter'),
  leadTitle: z.string().optional(),
  // Honeypot field: bot thường tự điền các field ẩn
  website: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = subscribeSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ' },
        { status: 400 },
      );
    }

    const { email, source, leadTitle, website } = parseResult.data;

    // 1. Honeypot check: nếu có dữ liệu ở field website -> là spam bot
    if (website && website.trim() !== '') {
      // Giả lập thành công để bot không thử lại cách khác
      return NextResponse.json({ success: true, message: 'Đăng ký thành công!' });
    }

    // 2. Rate limiting theo IP
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateLimit = checkRateLimit(`subscribe:${clientIp}`, 5, 600); // 5 request / 10 phút
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau ${rateLimit.resetSeconds} giây.`,
        },
        { status: 429 },
      );
    }

    // 3. Double Opt-in: tạo token xác thực
    const confirmToken = crypto.randomUUID();

    const existingSubscriber = await db.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber && existingSubscriber.status === 'CONFIRMED') {
      // Đã xác nhận trước đó: gửi trực tiếp link tải
      const confirmUrl = `${siteConfig.url}/api/subscribe/confirm?token=${existingSubscriber.confirmToken}`;
      await sendLeadMagnetConfirmEmail({
        to: email,
        confirmUrl,
        leadTitle,
      });

      return NextResponse.json({
        success: true,
        message:
          'Bạn đã đăng ký nhận tin! Chúng tôi vừa gửi lại liên kết tài liệu vào email của bạn.',
      });
    }

    // Tạo mới hoặc cập nhật token chờ xác nhận
    await db.subscriber.upsert({
      where: { email },
      create: {
        email,
        source,
        confirmToken,
        status: 'PENDING',
      },
      update: {
        source,
        confirmToken,
        status: 'PENDING',
      },
    });

    // 4. Gửi email xác nhận
    const confirmUrl = `${siteConfig.url}/api/subscribe/confirm?token=${confirmToken}`;
    await sendLeadMagnetConfirmEmail({
      to: email,
      confirmUrl,
      leadTitle,
    });

    return NextResponse.json({
      success: true,
      message:
        'Một email xác nhận vừa được gửi đến hòm thư của bạn. Vui lòng kiểm tra hộp thư (cả mục Spam) để nhận tài liệu.',
    });
  } catch (error) {
    console.error('❌ Lỗi khi xử lý đăng ký nhận tin:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.' },
      { status: 500 },
    );
  }
}
