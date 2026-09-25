import { describe, it, expect } from 'vitest';
import { addLine, migrateCartState, removeLine, setLineQty } from '@/lib/shop/cart-items';

describe('cart-items', () => {
  it('addLine cộng dồn khi trùng productId + variantId, tách dòng khi khác biến thể', () => {
    let items = addLine([], { productId: 'p1', variantId: 'a', qty: 1 });
    items = addLine(items, { productId: 'p1', variantId: 'a', qty: 2 });
    items = addLine(items, { productId: 'p1', variantId: 'b', qty: 1 });
    expect(items).toEqual([
      { productId: 'p1', variantId: 'a', qty: 3 },
      { productId: 'p1', variantId: 'b', qty: 1 },
    ]);
  });

  it('setLineQty <= 0 thì xóa dòng; chỉ đụng đúng biến thể', () => {
    const items = [
      { productId: 'p1', variantId: 'a', qty: 1 },
      { productId: 'p1', variantId: 'b', qty: 1 },
    ];
    expect(setLineQty(items, 'p1', 'a', 5)[0]?.qty).toBe(5);
    expect(setLineQty(items, 'p1', 'a', 0)).toEqual([{ productId: 'p1', variantId: 'b', qty: 1 }]);
  });

  it('removeLine dòng legacy (không variantId) không xóa nhầm dòng có biến thể', () => {
    const items = [
      { productId: 'p1', qty: 1 },
      { productId: 'p1', variantId: 'a', qty: 1 },
    ];
    expect(removeLine(items, 'p1')).toEqual([{ productId: 'p1', variantId: 'a', qty: 1 }]);
  });

  it('migrateCartState giữ item cũ, bỏ item hỏng, không crash với dữ liệu rác', () => {
    expect(
      migrateCartState({
        items: [{ productId: 'p1', qty: 2 }, { qty: 1 }, 'x', { productId: 'p2', qty: -1 }],
        couponCode: 'SALE',
      }),
    ).toEqual({ items: [{ productId: 'p1', qty: 2 }], couponCode: 'SALE' });
    expect(migrateCartState(null)).toEqual({ items: [], couponCode: null });
    expect(migrateCartState({ items: 'bad' })).toEqual({ items: [], couponCode: null });
  });
});
