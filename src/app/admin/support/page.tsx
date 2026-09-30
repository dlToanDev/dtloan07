import { Metadata } from 'next';
import { adminGetSupportTickets } from '@/server/actions/support';
import { SupportManager } from '@/components/admin/support-manager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trợ giúp & Hỗ trợ khách hàng | Quản trị hệ thống',
  description:
    'Trung tâm tiếp nhận yêu cầu hỗ trợ, live chat 2 chiều và giải quyết vấn đề kỹ thuật cho khách hàng.',
};

export default async function AdminSupportPage() {
  let tickets: Awaited<ReturnType<typeof adminGetSupportTickets>> = [];

  try {
    tickets = await adminGetSupportTickets('ALL');
  } catch (err) {
    console.error('Lỗi khi tải danh sách ticket trong admin page:', err);
  }

  return <SupportManager initialTickets={tickets} />;
}
