import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';

export default async function LegacyProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { kind: true, status: true },
  });
  if (!product || product.status !== 'ACTIVE') notFound();
  redirect(`/${product.kind === 'SOURCE_CODE' ? 'source-code' : 'shop'}/${slug}`);
}
