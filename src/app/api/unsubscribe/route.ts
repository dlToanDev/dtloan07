import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const unsubscribeSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = unsubscribeSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Email không hợp lệ' },
        { status: 400 },
      );
    }

    const { email } = parseResult.data;

    const subscriber = await db.subscriber.findUnique({
      where: { email },
    });

    if (subscriber) {
      await db.subscriber.update({
        where: { id: subscriber.id },
        data: {
          status: 'UNSUBSCRIBED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message:
        'Bạn đã huỷ đăng ký nhận thông báo thành công. Chúng tôi sẽ không làm phiền bạn nữa.',
    });
  } catch (error) {
    console.error('❌ Lỗi khi xử lý huỷ đăng ký:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
