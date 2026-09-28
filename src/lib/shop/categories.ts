import { db } from '@/lib/db';
import type { CategoryView } from '@/server/actions/product-category';

/** Danh mục Shop theo thứ tự hiển thị, kèm số sản phẩm (mọi trạng thái). */
export async function listCategories(): Promise<CategoryView[]> {
  const rows = await db.productCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      hasCondition: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });
  return rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products }));
}
