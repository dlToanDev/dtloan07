import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import { checkAdminScanRateLimit, getClientIp } from '@/lib/security/rate-limit';

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;
  const isAdmin = isLoggedIn && userRole === 'ADMIN';

  // 1. Bảo vệ các route Admin (/admin và /admin/*)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const ip = getClientIp(req.headers);
    const rateLimit = checkAdminScanRateLimit(ip);

    // Chặn brute-force / URL scanning nếu vượt quá tần suất
    if (!rateLimit.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    // Không phải ADMIN (chưa đăng nhập hoặc tài khoản thường):
    // Trả về 404 Not Found để KHÔNG làm lộ sự tồn tại của trang quản trị
    if (!isAdmin) {
      return new NextResponse(null, { status: 404 });
    }

    // Cho phép cổng vào Gateway xử lý cấp token mới
    if (pathname === '/admin/entry') {
      return NextResponse.next();
    }

    // Nếu truy cập trực tiếp /admin hoặc /admin/
    if (pathname === '/admin' || pathname === '/admin/') {
      const savedToken = req.cookies.get('admin_active_token')?.value;
      if (savedToken && savedToken.length >= 16) {
        return NextResponse.redirect(new URL(`/admin/${savedToken}${search}`, req.url));
      }
      return NextResponse.redirect(new URL('/admin/entry', req.url));
    }

    // Phân tích cấu trúc URL: /admin/:token hoặc /admin/:token/:subpath*
    const adminPathMatch = pathname.match(/^\/admin\/([a-zA-Z0-9_-]+)(?:\/(.*))?$/);
    if (adminPathMatch) {
      const tokenCandidate = adminPathMatch[1];
      const subPath = adminPathMatch[2] || '';

      // Nếu tokenCandidate không hợp lệ hoặc quá ngắn (vd: người dùng bấm link tĩnh cũ /admin/orders)
      if (!tokenCandidate || tokenCandidate.length < 16) {
        if (tokenCandidate) {
          const savedToken = req.cookies.get('admin_active_token')?.value;
          if (savedToken && savedToken.length >= 16) {
            const target = `/admin/${savedToken}/${tokenCandidate}${subPath ? '/' + subPath : ''}${search}`;
            return NextResponse.redirect(new URL(target, req.url));
          }
        }
        return new NextResponse(null, { status: 404 });
      }

      // Token có định dạng hợp lệ -> Rewrite nội bộ vào trang quản trị tương ứng
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-admin-token', tokenCandidate);
      requestHeaders.set('x-admin-original-path', pathname);

      const internalUrl = new URL(`/admin${subPath ? '/' + subPath : ''}${search}`, req.url);
      const response = NextResponse.rewrite(internalUrl, {
        request: {
          headers: requestHeaders,
        },
      });

      // Lưu lại token vào cookie bảo mật để hỗ trợ chuyển trang
      response.cookies.set('admin_active_token', tokenCandidate, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/admin',
        maxAge: 3600 * 24,
      });

      return response;
    }

    return new NextResponse(null, { status: 404 });
  }

  // 2. Bảo vệ các API Quản trị (/api/admin/*)
  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.next();
  }

  // 3. Bảo vệ các route cá nhân Authenticated (/account/*, /checkout/*)
  if (pathname.startsWith('/account') || pathname.startsWith('/checkout')) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(`${pathname}${search}`);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/admin', '/admin/:path*', '/api/admin/:path*'],
};
