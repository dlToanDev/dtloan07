import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VariantPurchasePanel } from '@/components/shop/variant-purchase-panel';
import type { VariantSnapshot } from '@/lib/shop/variants';

const variant = (over: Partial<VariantSnapshot>): VariantSnapshot => ({
  id: 'v1',
  name: 'Mặc định',
  priceVnd: 150000,
  compareAtVnd: null,
  stock: null,
  sortOrder: 0,
  active: true,
  ...over,
});

const render = (props: Parameters<typeof VariantPurchasePanel>[0]) =>
  renderToStaticMarkup(createElement(VariantPurchasePanel, props));

describe('VariantPurchasePanel', () => {
  it('hết hàng (số lượng = 0) → nút Liên hệ thay cho nút mua', () => {
    const html = render({
      productId: 'p',
      type: 'PHYSICAL',
      variants: [variant({ stock: 0 })],
    });
    expect(html).toContain('href="/about#lien-he"');
    expect(html).toContain('Liên hệ');
    expect(html).not.toContain('Thêm vào giỏ hàng');
  });

  it('còn hàng hoặc không giới hạn → nút mua bình thường', () => {
    for (const stock of [5, null]) {
      const html = render({ productId: 'p', type: 'PHYSICAL', variants: [variant({ stock })] });
      expect(html).toContain('Thêm vào giỏ hàng');
      expect(html).not.toContain('/about#lien-he');
    }
  });

  it('tài khoản tự động hết kho → Liên hệ; chọn sẵn phân loại còn hàng', () => {
    const empty = render({
      productId: 'p',
      type: 'ACCOUNT',
      deliveryMode: 'AUTO',
      variants: [variant({ availableAccounts: 0 })],
    });
    expect(empty).toContain('/about#lien-he');

    const mixed = render({
      productId: 'p',
      type: 'PHYSICAL',
      variants: [
        variant({ id: 'a', name: 'Đen / S', stock: 0 }),
        variant({ id: 'b', name: 'Đen / M', stock: 3, sortOrder: 1 }),
      ],
    });
    expect(mixed).toContain('Phân loại / Kích cỡ:');
    expect(mixed).toContain('Đen / M');
    expect(mixed).toContain('Còn hàng (3 sản phẩm sẵn có)');
    expect(mixed).toContain('Thêm vào giỏ hàng');
  });
});
