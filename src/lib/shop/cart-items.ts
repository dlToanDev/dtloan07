export interface CartItem {
  productId: string;
  variantId?: string;
  qty: number;
}

function isSameLine(item: CartItem, productId: string, variantId?: string) {
  return item.productId === productId && (item.variantId ?? null) === (variantId ?? null);
}

export function addLine(items: CartItem[], line: CartItem): CartItem[] {
  const qty = Math.max(1, Math.floor(line.qty));
  const index = items.findIndex((item) => isSameLine(item, line.productId, line.variantId));
  if (index === -1) {
    return [
      ...items,
      { productId: line.productId, ...(line.variantId && { variantId: line.variantId }), qty },
    ];
  }
  return items.map((item, i) => (i === index ? { ...item, qty: item.qty + qty } : item));
}

export function setLineQty(
  items: CartItem[],
  productId: string,
  variantId: string | undefined,
  qty: number,
): CartItem[] {
  const validQty = Math.floor(qty);
  if (validQty <= 0) return removeLine(items, productId, variantId);
  return items.map((item) =>
    isSameLine(item, productId, variantId) ? { ...item, qty: validQty } : item,
  );
}

export function removeLine(items: CartItem[], productId: string, variantId?: string): CartItem[] {
  return items.filter((item) => !isSameLine(item, productId, variantId));
}

/** Đọc state giỏ từ localStorage (mọi phiên bản cũ), loại bỏ dữ liệu hỏng. */
export function migrateCartState(persisted: unknown): {
  items: CartItem[];
  couponCode: string | null;
} {
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as {
    items?: unknown;
    couponCode?: unknown;
  };
  const rawItems = Array.isArray(state.items) ? state.items : [];
  const items: CartItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const { productId, variantId, qty } = raw as Record<string, unknown>;
    if (typeof productId !== 'string' || !productId) continue;
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 1) continue;
    items.push({
      productId,
      ...(typeof variantId === 'string' && variantId && { variantId }),
      qty: Math.floor(qty),
    });
  }
  return { items, couponCode: typeof state.couponCode === 'string' ? state.couponCode : null };
}
