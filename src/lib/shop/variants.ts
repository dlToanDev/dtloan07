export type ProductTypeValue = 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';

export interface VariantSnapshot {
  id: string;
  name: string;
  priceVnd: number;
  compareAtVnd: number | null;
  stock: number | null;
  sortOrder: number;
  active: boolean;
  /** Với tài khoản bàn giao tự động: số dòng kho còn trống. Loại khác bỏ trống. */
  availableAccounts?: number | null;
}

export interface ProductForCart {
  id: string;
  name: string;
  slug: string;
  coverUrl: string;
  type: ProductTypeValue;
  status: string;
  saleMode: string;
  deliveryMode?: 'AUTO' | 'MANUAL' | null;
  /** Dùng để xét phạm vi voucher theo danh mục. */
  categoryId?: string | null;
  variants: VariantSnapshot[];
}

export interface CartLineInput {
  productId: string;
  variantId?: string | null;
  qty: number;
}

export interface ResolvedCartLine {
  productId: string;
  variantId: string;
  qty: number;
  product: ProductForCart;
  variant: VariantSnapshot;
}

export interface CartLineError {
  productId: string;
  variantId?: string | null;
  message: string;
}

export interface VariantSummary {
  minPriceVnd: number;
  maxPriceVnd: number;
  compareAtVnd: number | null;
  hasMultiple: boolean;
  soldOut: boolean;
}

/** Loại hàng đang cho phép mua. */
export const PURCHASABLE_TYPES: readonly ProductTypeValue[] = ['DOWNLOAD', 'PHYSICAL', 'ACCOUNT'];

/** Số lượng tối đa mỗi dòng giỏ hàng với tài khoản số (spec 5.2). */
export const MAX_ACCOUNT_QTY_PER_LINE = 5;

/**
 * Tồn kho thực tế của một biến thể.
 * Tài khoản bàn giao tự động không dùng cột `stock` mà đếm số dòng kho còn trống.
 */
export function effectiveStock(
  product: Pick<ProductForCart, 'type' | 'deliveryMode'>,
  variant: VariantSnapshot,
): number | null {
  if (product.type === 'ACCOUNT' && product.deliveryMode === 'AUTO') {
    return variant.availableAccounts ?? 0;
  }
  return variant.stock;
}

export function lineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

function byDisplayOrder(a: VariantSnapshot, b: VariantSnapshot) {
  return a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function pickDefaultVariant(variants: VariantSnapshot[]): VariantSnapshot | null {
  return variants.filter((variant) => variant.active).sort(byDisplayOrder)[0] ?? null;
}

/**
 * Chuẩn hóa giỏ hàng từ client: gắn biến thể mặc định cho dòng cũ, gộp dòng trùng,
 * kiểm tra loại hàng được bán và tồn kho. Không bao giờ throw.
 */
export function resolveCartLines(
  items: CartLineInput[],
  products: ProductForCart[],
  purchasable: readonly ProductTypeValue[] = PURCHASABLE_TYPES,
): { lines: ResolvedCartLine[]; errors: CartLineError[] } {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const merged = new Map<string, ResolvedCartLine>();
  const errors: CartLineError[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== 'ACTIVE') {
      errors.push({ productId: item.productId, message: 'Sản phẩm không còn được bán.' });
      continue;
    }
    if (!purchasable.includes(product.type)) {
      errors.push({
        productId: item.productId,
        variantId: item.variantId,
        message: `"${product.name}" đang ở trạng thái Sắp mở bán.`,
      });
      continue;
    }
    const variant = item.variantId
      ? product.variants.find((candidate) => candidate.id === item.variantId && candidate.active)
      : pickDefaultVariant(product.variants);
    if (!variant) {
      errors.push({
        productId: item.productId,
        variantId: item.variantId,
        message: `Lựa chọn của "${product.name}" không còn được bán.`,
      });
      continue;
    }
    const rawQty = Math.max(1, Math.floor(item.qty || 1));
    // Tài khoản số giới hạn số lượng mỗi dòng để tránh gom sạch kho trong một đơn.
    const qty = product.type === 'ACCOUNT' ? Math.min(rawQty, MAX_ACCOUNT_QTY_PER_LINE) : rawQty;
    const key = lineKey(product.id, variant.id);
    const existing = merged.get(key);
    if (existing) existing.qty += qty;
    else merged.set(key, { productId: product.id, variantId: variant.id, qty, product, variant });
  }

  const lines: ResolvedCartLine[] = [];
  for (const line of merged.values()) {
    const stock = effectiveStock(line.product, line.variant);
    if (stock === 0) {
      errors.push({
        productId: line.productId,
        variantId: line.variantId,
        message: `"${line.product.name} – ${line.variant.name}" đã hết hàng.`,
      });
      continue;
    }
    if (stock !== null && line.qty > stock) {
      errors.push({
        productId: line.productId,
        variantId: line.variantId,
        message: `"${line.product.name} – ${line.variant.name}" chỉ còn ${stock}.`,
      });
      continue;
    }
    lines.push(line);
  }
  return { lines, errors };
}

export function summarizeVariants(variants: VariantSnapshot[]): VariantSummary {
  const active = variants.filter((variant) => variant.active);
  if (active.length === 0) {
    return {
      minPriceVnd: 0,
      maxPriceVnd: 0,
      compareAtVnd: null,
      hasMultiple: false,
      soldOut: true,
    };
  }
  const cheapest = active.reduce((min, variant) =>
    variant.priceVnd < min.priceVnd ? variant : min,
  );
  return {
    minPriceVnd: cheapest.priceVnd,
    maxPriceVnd: Math.max(...active.map((variant) => variant.priceVnd)),
    compareAtVnd: cheapest.compareAtVnd,
    hasMultiple: active.length > 1,
    soldOut: active.every((variant) => variant.stock !== null && variant.stock <= 0),
  };
}

/** ["Đen, Trắng", "S, M"] → ["Đen / S", "Đen / M", "Trắng / S", "Trắng / M"] */
export function generateVariantCombos(groups: string[]): string[] {
  const parsed = groups
    .map((group) => [
      ...new Set(
        group
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ])
    .filter((values) => values.length > 0);
  if (parsed.length === 0) return [];
  return parsed.reduce<string[]>(
    (combos, values) =>
      combos.flatMap((prefix) => values.map((value) => (prefix ? `${prefix} / ${value}` : value))),
    [''],
  );
}
