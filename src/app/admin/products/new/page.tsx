import { ProductEditorPage } from '@/components/admin/product-editor-page';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <ProductEditorPage basePath="/admin/products" />;
}
