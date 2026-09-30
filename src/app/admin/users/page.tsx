import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Trang quản lý người dùng / thành viên của Admin.
 * Điều hướng tự động về trung tâm kiểm duyệt & quản lý người dùng (/admin/:token/community).
 */
export default async function AdminUsersPage() {
  const headerList = await headers();
  const token = headerList.get('x-admin-token');

  if (token) {
    redirect(`/admin/${token}/community`);
  }

  redirect('/admin/community');
}
