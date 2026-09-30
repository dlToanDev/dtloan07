import { describe, it, expect } from 'vitest';
import {
  generateVariantCombos,
  lineKey,
  pickDefaultVariant,
  resolveCartLines,
  summarizeVariants,
  type ProductForCart,
  type VariantSnapshot,
} from '@/lib/shop/variants';

const v = (over: Partial<VariantSnapshot> & { id: string }): VariantSnapshot => ({
  name: over.id,
  priceVnd: 100000,
  compareAtVnd: null,
  stock: null,
  sortOrder: 0,
  active: true,
  ...over,
});

const product = (over: Partial<ProductForCart> & { id: string }): ProductForCart => ({
  name: 'SP',
  slug: over.id,
  coverUrl: '',
  type: 'DOWNLOAD',
  status: 'ACTIVE',
  saleMode: 'PAID',
  variants: [v({ id: `${over.id}-v1` })],
  ...over,
});

describe('lineKey', () => {
  it('ghép productId và variantId, bỏ variantId rỗng', () => {
    expect(lineKey('p1', 'v1')).toBe('p1:v1');
    expect(lineKey('p1')).toBe('p1');
    expect(lineKey('p1', null)).toBe('p1');
  });
});

describe('pickDefaultVariant', () => {
  it('chọn biến thể active có sortOrder nhỏ nhất, hòa thì id nhỏ hơn', () => {
    const picked = pickDefaultVariant([
      v({ id: 'b', sortOrder: 1 }),
      v({ id: 'c', sortOrder: 0 }),
      v({ id: 'a', sortOrder: 0 }),
      v({ id: 'z', sortOrder: -1, active: false }),
    ]);
    expect(picked?.id).toBe('a');
  });
  it('trả null khi không còn biến thể active', () => {
    expect(pickDefaultVariant([v({ id: 'x', active: false })])).toBeNull();
  });
});

describe('resolveCartLines', () => {
  const p1 = product({
    id: 'p1',
    variants: [v({ id: 'p1-a', sortOrder: 0 }), v({ id: 'p1-b', sortOrder: 1, stock: 2 })],
  });

  it('dòng legacy không có variantId dùng biến thể mặc định', () => {
    const { lines, errors } = resolveCartLines([{ productId: 'p1', qty: 1 }], [p1]);
    expect(errors).toEqual([]);
    expect(lines[0]?.variantId).toBe('p1-a');
  });

  it('gộp dòng legacy và dòng có variantId mặc định thành 1 dòng', () => {
    const { lines } = resolveCartLines(
      [
        { productId: 'p1', qty: 1 },
        { productId: 'p1', variantId: 'p1-a', qty: 2 },
      ],
      [p1],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(3);
  });

  it('báo lỗi khi vượt tồn kho', () => {
    const { lines, errors } = resolveCartLines(
      [{ productId: 'p1', variantId: 'p1-b', qty: 3 }],
      [p1],
    );
    expect(lines).toHaveLength(0);
    expect(errors[0]?.message).toContain('chỉ còn 2');
  });

  it('báo lỗi khi sản phẩm hoặc biến thể không tồn tại / inactive', () => {
    const { errors } = resolveCartLines(
      [
        { productId: 'nope', qty: 1 },
        { productId: 'p1', variantId: 'ghost', qty: 1 },
      ],
      [p1],
    );
    expect(errors).toHaveLength(2);
  });

  it('báo lỗi khi mọi biến thể đều inactive', () => {
    const dead = product({ id: 'p2', variants: [v({ id: 'p2-a', active: false })] });
    const { lines, errors } = resolveCartLines([{ productId: 'p2', qty: 1 }], [dead]);
    expect(lines).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('cho mua hàng vật lý từ giai đoạn 2', () => {
    const shirt = product({ id: 'p4', type: 'PHYSICAL' });
    const { lines, errors } = resolveCartLines([{ productId: 'p4', qty: 1 }], [shirt]);
    expect(errors).toEqual([]);
    expect(lines).toHaveLength(1);
  });

  it('từ chối loại hàng chưa mở bán', () => {
    const shirt = product({ id: 'p5', type: 'PHYSICAL' });
    const { lines, errors } = resolveCartLines(
      [{ productId: 'p5', qty: 1 }],
      [shirt],
      ['DOWNLOAD'],
    );
    expect(lines).toHaveLength(0);
    expect(errors[0]?.message).toContain('Sắp mở bán');
  });

  it('tài khoản tự động: tồn kho tính theo số dòng kho còn trống', () => {
    const netflix = product({
      id: 'acc',
      type: 'ACCOUNT',
      deliveryMode: 'AUTO',
      variants: [v({ id: 'acc-3m', stock: null, availableAccounts: 2 })],
    });
    const ok = resolveCartLines([{ productId: 'acc', variantId: 'acc-3m', qty: 2 }], [netflix]);
    expect(ok.errors).toEqual([]);

    const tooMany = resolveCartLines(
      [{ productId: 'acc', variantId: 'acc-3m', qty: 3 }],
      [netflix],
    );
    expect(tooMany.lines).toHaveLength(0);
    expect(tooMany.errors[0]?.message).toContain('chỉ còn 2');
  });

  it('tài khoản tự động hết kho thì báo hết hàng', () => {
    const netflix = product({
      id: 'acc2',
      type: 'ACCOUNT',
      deliveryMode: 'AUTO',
      variants: [v({ id: 'acc2-v', stock: null, availableAccounts: 0 })],
    });
    const { lines, errors } = resolveCartLines([{ productId: 'acc2', qty: 1 }], [netflix]);
    expect(lines).toHaveLength(0);
    expect(errors[0]?.message).toContain('hết hàng');
  });

  it('tài khoản bàn giao thủ công không bị chặn bởi kho', () => {
    const codex = product({
      id: 'acc3',
      type: 'ACCOUNT',
      deliveryMode: 'MANUAL',
      variants: [v({ id: 'acc3-v', stock: null })],
    });
    const { lines, errors } = resolveCartLines([{ productId: 'acc3', qty: 2 }], [codex]);
    expect(errors).toEqual([]);
    expect(lines[0]?.qty).toBe(2);
  });

  it('giới hạn 5 tài khoản mỗi dòng giỏ hàng', () => {
    const codex = product({
      id: 'acc4',
      type: 'ACCOUNT',
      deliveryMode: 'MANUAL',
      variants: [v({ id: 'acc4-v', stock: null })],
    });
    const { lines } = resolveCartLines([{ productId: 'acc4', qty: 99 }], [codex]);
    expect(lines[0]?.qty).toBe(5);
  });

  it('chuẩn hóa qty về số nguyên >= 1', () => {
    const { lines } = resolveCartLines([{ productId: 'p1', qty: 0 }], [p1]);
    expect(lines[0]?.qty).toBe(1);
  });
});

describe('summarizeVariants', () => {
  it('tính giá thấp/cao nhất và giá gạch của biến thể rẻ nhất', () => {
    const s = summarizeVariants([
      v({ id: 'a', priceVnd: 150000 }),
      v({ id: 'b', priceVnd: 90000, compareAtVnd: 120000 }),
      v({ id: 'c', priceVnd: 10, active: false }),
    ]);
    expect(s).toEqual({
      minPriceVnd: 90000,
      maxPriceVnd: 150000,
      compareAtVnd: 120000,
      hasMultiple: true,
      soldOut: false,
    });
  });
  it('soldOut khi mọi biến thể active có stock = 0 hoặc không có biến thể active', () => {
    expect(summarizeVariants([v({ id: 'a', stock: 0 })]).soldOut).toBe(true);
    expect(summarizeVariants([v({ id: 'a', active: false })]).soldOut).toBe(true);
    expect(summarizeVariants([v({ id: 'a', stock: null })]).soldOut).toBe(false);
  });
});

describe('generateVariantCombos', () => {
  it('sinh tổ hợp theo thứ tự nhóm, bỏ khoảng trắng và giá trị trùng', () => {
    expect(generateVariantCombos(['Đen, Trắng', 'S, M, M '])).toEqual([
      'Đen / S',
      'Đen / M',
      'Trắng / S',
      'Trắng / M',
    ]);
  });
  it('bỏ qua nhóm rỗng', () => {
    expect(generateVariantCombos(['', '1 tháng, 3 tháng'])).toEqual(['1 tháng', '3 tháng']);
    expect(generateVariantCombos(['', ' '])).toEqual([]);
  });
});
