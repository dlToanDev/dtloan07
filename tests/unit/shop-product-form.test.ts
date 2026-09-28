import { describe, it, expect } from 'vitest';
import {
  duplicateLineKeys,
  formatMoney,
  linesToRows,
  newLine,
  parseMoney,
  toLine,
  variantLineName,
  missingForPublish,
  moveItem,
  serializeRows,
  toRow,
  type PricingRow,
  type VariantDefault,
} from '@/lib/shop/product-form';
import { parseVariantsInput } from '@/lib/shop/variant-input';

const row = (over: Partial<PricingRow> = {}): PricingRow => ({
  key: over.key ?? Math.random().toString(36),
  name: 'Mặc định',
  sku: '',
  priceVnd: '',
  compareAtVnd: '',
  stock: '',
  active: true,
  ...over,
});

const variant = (name: string, over: Partial<VariantDefault> = {}): VariantDefault => ({
  name,
  sku: null,
  priceVnd: 1000,
  compareAtVnd: null,
  stock: null,
  active: true,
  ...over,
});

describe('variantLineName', () => {
  it('ghép màu / size, bỏ ô trống, không có gì → "Mặc định"', () => {
    expect(variantLineName(['Đen', 'M'])).toBe('Đen / M');
    expect(variantLineName(['', ' L '])).toBe('L');
    expect(variantLineName(['', ''])).toBe('Mặc định');
  });
});

describe('toLine', () => {
  it('tách tên biến thể thành màu + size', () => {
    expect(toLine(variant('Đen / M', { id: 'v1', stock: 3 }), 2)).toMatchObject({
      id: 'v1',
      attrs: ['Đen', 'M'],
      stock: '3',
    });
    expect(toLine(variant('Mặc định'), 2).attrs).toEqual(['', '']);
  });

  it('tài khoản số giữ nguyên tên trong một ô', () => {
    expect(toLine(variant('Dùng riêng / 1 tháng'), 1).attrs).toEqual(['Dùng riêng / 1 tháng', '']);
  });
});

describe('newLine', () => {
  it('lấy sẵn màu và giá của dòng trước, size để trống', () => {
    const prev = { ...newLine(), attrs: ['Đen', 'S'] as [string, string], priceVnd: '150000' };
    expect(newLine(prev)).toMatchObject({ attrs: ['Đen', ''], priceVnd: '150000', stock: '' });
    expect(newLine().attrs).toEqual(['', '']);
  });
});

describe('linesToRows / duplicateLineKeys', () => {
  it('đổi dòng thành biến thể có tên ghép, phát hiện dòng trùng (không phân biệt hoa thường)', () => {
    const a = { ...newLine(), attrs: ['Đen', 'M'] as [string, string] };
    const b = { ...newLine(), attrs: ['đen', 'm'] as [string, string] };
    const c = { ...newLine(), attrs: ['Trắng', 'M'] as [string, string] };
    expect(linesToRows([a, c]).map((row) => row.name)).toEqual(['Đen / M', 'Trắng / M']);
    expect(duplicateLineKeys([a, b, c])).toEqual(new Set([a.key, b.key]));
  });
});

describe('parseMoney / formatMoney', () => {
  it('hiểu các kiểu gõ giá thường gặp', () => {
    expect(parseMoney('150000')).toBe('150000');
    expect(parseMoney('150.000')).toBe('150000');
    expect(parseMoney('150k')).toBe('150000');
    expect(parseMoney('1.5tr')).toBe('1500000');
    expect(parseMoney('1,5 triệu')).toBe('1500000');
    expect(parseMoney('99.000đ')).toBe('99000');
    expect(parseMoney('1.500k')).toBe('1500000');
    expect(parseMoney('1,500,000')).toBe('1500000');
    expect(parseMoney('2,5k')).toBe('2500');
    expect(parseMoney('1.5')).toBe('');
    expect(parseMoney('1tỷ')).toBe('');
    expect(parseMoney('abc')).toBe('');
    expect(parseMoney('')).toBe('');
  });

  it('định dạng có dấu chấm ngăn cách', () => {
    expect(formatMoney('1500000')).toBe('1.500.000');
    expect(formatMoney('')).toBe('');
  });
});

describe('serializeRows', () => {
  it('tạo payload hợp lệ với parser phía server', () => {
    const payload = serializeRows(
      [row({ id: 'x', priceVnd: '100000', compareAtVnd: '150000', stock: '3' })],
      false,
    );
    const parsed = parseVariantsInput(JSON.stringify(payload));
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(parsed.variants[0]).toMatchObject({ id: 'x', priceVnd: 100000, stock: 3 });
  });

  it('bỏ giá gạch ngang cũ không còn lớn hơn giá bán (vừa tăng giá)', () => {
    const payload = serializeRows([row({ priceVnd: '250000', compareAtVnd: '200000' })], false);
    expect(payload[0]?.compareAtVnd).toBe('');
    expect(parseVariantsInput(JSON.stringify(payload)).ok).toBe(true);
  });

  it('bỏ tồn kho khi kho tài khoản quyết định số lượng', () => {
    const [first] = serializeRows([row({ priceVnd: '1', stock: '9' })], true);
    expect(first?.stock).toBe('');
  });

  it('toRow đọc lại biến thể từ DB', () => {
    const back = toRow({
      id: 'v',
      name: 'S',
      sku: null,
      priceVnd: 10,
      compareAtVnd: null,
      stock: null,
      active: false,
    });
    expect(back).toMatchObject({ id: 'v', name: 'S', priceVnd: '10', stock: '', active: false });
  });
});

describe('missingForPublish', () => {
  const ready = {
    type: 'PHYSICAL' as const,
    name: 'Áo',
    shortDesc: 'Áo đẹp',
    category: 'cat_apparel',
    deliveryMode: '',
    saleMode: 'PAID' as const,
    downloadPrice: '',
    variantPrices: ['100000'],
  };

  it('đủ thông tin → không thiếu gì', () => {
    expect(missingForPublish(ready)).toEqual([]);
  });

  it('liệt kê các mục còn thiếu theo thứ tự các bước', () => {
    expect(
      missingForPublish({
        ...ready,
        name: ' ',
        category: '',
        variantPrices: ['0'],
      }),
    ).toEqual(['danh mục', 'tên sản phẩm', 'giá bán']);
  });

  it('chưa chọn loại hàng → chỉ nhắc chọn loại hàng trước', () => {
    expect(missingForPublish({ ...ready, type: '', name: '', category: '' })).toEqual([
      'loại hàng',
      'tên sản phẩm',
    ]);
  });

  it('tài khoản số cũng cần danh mục và cách bàn giao', () => {
    expect(
      missingForPublish({ ...ready, type: 'ACCOUNT', category: '', deliveryMode: '' }),
    ).toEqual(['danh mục', 'cách bàn giao']);
  });

  it('source code dùng giá của hình thức bán', () => {
    const download = { ...ready, type: 'DOWNLOAD' as const, variantPrices: [] };
    expect(missingForPublish({ ...download, saleMode: 'PAID', downloadPrice: '' })).toEqual([
      'giá bán',
    ]);
    expect(missingForPublish({ ...download, saleMode: 'FREE' })).toEqual([]);
  });

  it('source code cũng cần danh mục như mọi hàng Shop', () => {
    expect(
      missingForPublish({ ...ready, type: 'DOWNLOAD', category: '', saleMode: 'CONTACT' }),
    ).toEqual(['danh mục']);
  });
});

describe('moveItem', () => {
  it('chuyển phần tử sang vị trí mới', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('vị trí không hợp lệ → giữ nguyên', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 5)).toBe(list);
  });
});
