import { notFound, redirect } from 'next/navigation';
import { isValidAffiliateToken } from '@/lib/affiliate-token';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Đang chuyển hướng...',
    robots: { index: false, follow: false },
  };
}

export default async function DynamicAffiliatePage({ params }: PageProps) {
  const { token } = await params;

  if (isValidAffiliateToken(token)) {
    redirect('/affiliate');
  }

  notFound();
}
