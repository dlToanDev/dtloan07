import { redirect } from 'next/navigation';

export default async function OldProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/shop/${slug}`);
}
