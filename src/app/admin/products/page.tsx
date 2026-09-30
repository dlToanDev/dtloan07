import { ProductManager } from '@/components/admin/product-manager';

export const dynamic = 'force-dynamic';

interface AdminProductsPageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
    q?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  return <ProductManager searchParams={resolvedSearchParams} basePath="/admin/products" />;
}
