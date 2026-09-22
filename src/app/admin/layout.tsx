import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Server-side RBAC: Chặn hoàn toàn nếu không phải ADMIN
  if (!session?.user || session.user.role !== 'ADMIN') {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col items-start gap-6 lg:flex-row xl:gap-8">
        {/* Thanh Navbar bên tay trái (Admin Sidebar) */}
        <AdminSidebar userEmail={session.user.email ?? ''} />

        {/* Khu vực nội dung quản trị */}
        <div className="w-full min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
