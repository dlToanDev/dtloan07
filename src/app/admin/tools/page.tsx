import { db } from '@/lib/db';
import { ToolManager } from '@/components/admin/tool-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Tool Code & Tiện ích - Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminToolsPage() {
  let tools: Awaited<ReturnType<typeof db.affiliateItem.findMany>> = [];
  try {
    tools = await db.affiliateItem.findMany({
      where: {
        category: {
          in: ['DEVTOOLS', 'DEVOPS', 'TOOLCODE'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Lỗi tải danh sách tool code:', err);
  }

  return (
    <div className="space-y-6">
      <ToolManager initialTools={tools} />
    </div>
  );
}
