import { describe, it, expect } from 'vitest';
import { buildShopWhere, parseShopFilters } from '@/lib/shop/filters';

describe('parseShopFilters', () => {
  it('đọc slug danh mục và tình trạng hợp lệ', () => {
    expect(parseShopFilters({ c: 'do-cong-nghe', cond: 'nhu-moi' })).toEqual({
      category: 'TECH',
      categorySlug: 'do-cong-nghe',
      condition: 'LIKE_NEW',
      conditionSlug: 'nhu-moi',
    });
  });
  it('bỏ qua giá trị rác, mảng và tình trạng khi không phải đồ công nghệ', () => {
    expect(parseShopFilters({ c: 'abc', cond: 'moi' })).toEqual({});
    expect(parseShopFilters({ c: ['quan-ao', 'mu'] })).toEqual({
      category: 'APPAREL',
      categorySlug: 'quan-ao',
    });
    expect(parseShopFilters({ c: 'quan-ao', cond: 'moi' })).toEqual({
      category: 'APPAREL',
      categorySlug: 'quan-ao',
    });
    expect(parseShopFilters({})).toEqual({});
  });
});

describe('buildShopWhere', () => {
  it('luôn lọc Shop đang bán, thêm category/condition khi có', () => {
    expect(buildShopWhere({})).toEqual({ status: 'ACTIVE', kind: 'SHOP' });
    expect(buildShopWhere({ category: 'TECH', condition: 'USED' })).toEqual({
      status: 'ACTIVE',
      kind: 'SHOP',
      category: 'TECH',
      condition: 'USED',
    });
  });
});
