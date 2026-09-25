import { ProductManager } from '@/components/admin/product-manager';

export const dynamic = 'force-dynamic';
export default function Page() {
  return <ProductManager kind="SHOP" />;
}
