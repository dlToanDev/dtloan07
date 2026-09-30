import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateSecureAdminToken } from '@/lib/security/admin-token';
import { logAuditEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/**
 * Route cổng vào (Gateway) bảo mật dành cho Quản trị viên.
 * Khi Admin đăng nhập và truy cập vào trang quản trị, cổng vào này sẽ xác thực quyền ADMIN,
 * cấp token bảo mật động mới (Expiring & Rotating), ghi Audit Log, và chuyển hướng đến:
 * /admin/<secure-token>
 */
export async function GET(request: Request) {
  const session = await auth();

  // Chặn hoàn toàn và trả về 404 để không làm lộ thông tin hệ thống quản trị tồn tại
  if (!session?.user || session.user.role !== 'ADMIN' || !session.user.id) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    // Sinh token bảo mật ngẫu nhiên chuẩn cryptographic
    const { token } = await generateSecureAdminToken(session.user.id);

    await logAuditEvent({
      action: 'ADMIN_LOGIN_SUCCESS',
      actorId: session.user.id,
      actorEmail: session.user.email,
      details: {
        method: 'ADMIN_GATEWAY_ENTRY',
      },
    });

    const url = new URL(request.url);
    const targetUrl = new URL(`/admin/${token}`, url.origin);

    const response = NextResponse.redirect(targetUrl, { status: 302 });

    // Lưu cookie xác nhận phiên admin token
    response.cookies.set('admin_active_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/admin',
      maxAge: 3600 * 24,
    });

    return response;
  } catch (err) {
    console.error('Lỗi khởi tạo Admin Gateway:', err);
    return new NextResponse(null, { status: 404 });
  }
}
