import { ProductManager } from '@/components/admin/product-manager';

export const dynamic = 'force-dynamic';

interface AdminShopPageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
    q?: string;
  }>;
}

export default async function AdminShopPage({ searchParams }: AdminShopPageProps) {
  const resolvedSearchParams = await searchParams;
  return <ProductManager searchParams={resolvedSearchParams} basePath="/admin/shop" />;
}
