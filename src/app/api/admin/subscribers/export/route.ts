import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const subscribers = await db.subscriber.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const header = 'Email,Status,Source,ConfirmedAt,CreatedAt\n';
  const rows = subscribers
    .map((s) => {
      const confirmed = s.confirmedAt ? s.confirmedAt.toISOString() : '';
      const created = s.createdAt.toISOString();
      return `"${s.email}","${s.status}","${s.source}","${confirmed}","${created}"`;
    })
    .join('\n');

  const csvContent = header + rows;
  const dateStr = new Date().toISOString().split('T')[0];

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscribers-${dateStr}.csv"`,
    },
  });
}
