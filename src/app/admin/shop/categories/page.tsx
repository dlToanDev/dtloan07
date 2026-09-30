import { requireProductAdmin } from '@/server/actions/product';
import { listCategories } from '@/lib/shop/categories';
import { CategoryManager } from '@/components/admin/shop/category-manager';

export const dynamic = 'force-dynamic';

export default async function ShopCategoriesPage() {
  await requireProductAdmin();
  const categories = await listCategories().catch((err) => {
    console.warn('Lỗi tải danh mục shop:', err);
    return [];
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Danh mục shop</h1>
        <p className="text-muted-foreground text-sm">
          Thêm, đổi tên, sắp xếp danh mục. Trang Shop chỉ hiện danh mục đang có sản phẩm bán, theo
          đúng thứ tự dưới đây.
        </p>
      </div>
      <CategoryManager initial={categories} />
    </div>
  );
}
