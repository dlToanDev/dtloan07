import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { validateAdminToken } from '@/lib/security/admin-token';
import { logAuditEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // 1. Server-side RBAC: Chặn hoàn toàn nếu không phải ADMIN
  if (!session?.user || session.user.role !== 'ADMIN' || !session.user.id) {
    notFound();
  }

  const headerList = await headers();
  const token = headerList.get('x-admin-token');

  // 2. Kiểm tra sự tồn tại của Token bảo mật trong request
  if (!token) {
    notFound();
  }

  // 3. Xác thực tính hợp lệ của token trong Database (kiểm tra hash, TTL hết hạn, và trạng thái thu hồi)
  const validation = await validateAdminToken(token);
  if (!validation.valid) {
    await logAuditEvent({
      action: 'ADMIN_ACCESS_BLOCKED',
      actorId: session.user.id,
      actorEmail: session.user.email,
      details: {
        reason: validation.reason,
        tokenPrefix: `${token.slice(0, 8)}...`,
      },
    });
    notFound();
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:pr-8 lg:pl-72 xl:pl-80">
      <div className="flex flex-col items-start gap-6">
        {/* Thanh Navbar bên tay trái (Admin Sidebar) tích hợp URL Token động */}
        <AdminSidebar
          userEmail={session.user.email ?? ''}
          userName={session.user.name ?? 'Hoàng Anh Toàn'}
          adminToken={token}
        />

        {/* Khu vực nội dung quản trị */}
        <div className="w-full min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
