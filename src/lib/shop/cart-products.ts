import { db } from '@/lib/db';
import type { ProductPriceSnapshot } from '@/lib/pricing';
import { countAvailableAccounts } from '@/lib/shop/account-stock';
import { lineKey, type ProductForCart, type ResolvedCartLine } from '@/lib/shop/variants';

/** Đọc sản phẩm đang bán kèm biến thể, trả về dạng thuần cho resolveCartLines. */
export async function loadCartProducts(productIds: string[]): Promise<ProductForCart[]> {
  if (productIds.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: [...new Set(productIds)] }, status: 'ACTIVE', saleMode: 'PAID' },
    include: { variants: true },
  });

  // Tài khoản bàn giao tự động lấy tồn kho từ bảng AccountStock, không từ cột stock.
  const autoVariantIds = rows
    .filter((row) => row.type === 'ACCOUNT' && row.deliveryMode === 'AUTO')
    .flatMap((row) => row.variants.map((variant) => variant.id));
  const availableAccounts = await countAvailableAccounts(autoVariantIds);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    coverUrl: row.coverUrl,
    type: row.type,
    status: row.status,
    saleMode: row.saleMode,
    deliveryMode: row.deliveryMode,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceVnd: variant.priceVnd,
      compareAtVnd: variant.compareAtVnd,
      stock: variant.stock,
      sortOrder: variant.sortOrder,
      active: variant.active,
      availableAccounts: availableAccounts.get(variant.id) ?? 0,
    })),
  }));
}

export function buildPriceMap(lines: ResolvedCartLine[]) {
  const map = new Map<string, ProductPriceSnapshot>();
  for (const line of lines) {
    map.set(lineKey(line.productId, line.variantId), {
      id: line.productId,
      priceVnd: line.variant.priceVnd,
      status: line.product.status,
    });
  }
  return map;
}
