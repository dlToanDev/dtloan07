import { describe, it, expect } from 'vitest';
import { authConfig } from '@/lib/auth.config';
import { Role } from '@prisma/client';
import { isPro } from '@/lib/membership';

describe('Access Control & Permissions', () => {
  describe('authConfig authorized callback route protection', () => {
    const authorized = authConfig.callbacks.authorized;
    type AuthorizedArgs = Parameters<typeof authorized>[0];
    const req = (pathname: string) =>
      ({
        nextUrl: new URL(`http://localhost:5000${pathname}`),
      }) as unknown as AuthorizedArgs['request'];
    const session = (id: string, role: Role) =>
      ({ user: { id, role } }) as unknown as AuthorizedArgs['auth'];

    it('1. Khách chưa đăng nhập: Cho phép truy cập route công khai (blog, shop, home)', () => {
      const publicRoutes = ['/', '/blog', '/blog/my-post', '/shop', '/courses', '/about'];
      for (const pathname of publicRoutes) {
        const result = authorized({
          auth: null,
          request: req(pathname),
        });
        expect(result).toBe(true);
      }
    });

    it('2. Khách chưa đăng nhập: Bị chặn khi vào /checkout', () => {
      const result = authorized({
        auth: null,
        request: req('/checkout'),
      });
      expect(result).toBe(false);
    });

    it('3. Người dùng đã đăng nhập: Được phép vào /checkout', () => {
      const result = authorized({
        auth: session('u1', Role.USER),
        request: req('/checkout'),
      });
      expect(result).toBe(true);
    });

    it('4. Khách chưa đăng nhập: Bị chặn khi vào /account', () => {
      const result = authorized({
        auth: null,
        request: req('/account'),
      });
      expect(result).toBe(false);
    });

    it('5. Thành viên thường: Bị chặn khi vào /admin', () => {
      const result = authorized({
        auth: session('u1', Role.USER),
        request: req('/admin/orders'),
      });
      expect(result).toBe(false);
    });

    it('6. Quản trị viên (ADMIN): Được phép vào /admin', () => {
      const result = authorized({
        auth: session('admin1', Role.ADMIN),
        request: req('/admin/orders'),
      });
      expect(result).toBe(true);
    });
  });

  describe('Phân quyền đăng bài viết cộng đồng', () => {
    it('1. Thành viên thường (không có Pro) không được coi là Pro', () => {
      expect(isPro(null)).toBe(false);
      expect(isPro({ proUntil: null })).toBe(false);
      expect(isPro({ proUntil: new Date(Date.now() - 10000) })).toBe(false);
    });

    it('2. Thành viên Pro (còn hạn) được coi là Pro', () => {
      expect(isPro({ proUntil: new Date(Date.now() + 86400000) })).toBe(true);
    });

    it('3. Logic kiểm tra quyền đăng bài: Cho phép nếu là Admin hoặc là Pro', () => {
      const canPost = (user: { role: Role; proUntil: Date | null }) => {
        return user.role === Role.ADMIN || isPro(user);
      };

      // User thường không có Pro
      expect(canPost({ role: Role.USER, proUntil: null })).toBe(false);
      // User thường có Pro
      expect(canPost({ role: Role.USER, proUntil: new Date(Date.now() + 86400000) })).toBe(true);
      // Admin không có Pro
      expect(canPost({ role: Role.ADMIN, proUntil: null })).toBe(true);
      // Admin có Pro
      expect(canPost({ role: Role.ADMIN, proUntil: new Date(Date.now() + 86400000) })).toBe(true);
    });
  });
});
