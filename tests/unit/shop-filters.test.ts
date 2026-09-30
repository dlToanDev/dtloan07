import { describe, it, expect } from 'vitest';
import { buildShopWhere, parseShopFilters } from '@/lib/shop/filters';

const categories = [
  { id: 'cat_tech', slug: 'do-cong-nghe', hasCondition: true },
  { id: 'cat_apparel', slug: 'quan-ao', hasCondition: false },
  { id: 'cat_hat', slug: 'mu', hasCondition: false },
];

describe('parseShopFilters', () => {
  it('đọc slug danh mục và tình trạng hợp lệ', () => {
    expect(parseShopFilters({ c: 'do-cong-nghe', cond: 'nhu-moi' }, categories)).toEqual({
      categoryId: 'cat_tech',
      categorySlug: 'do-cong-nghe',
      hasCondition: true,
      condition: 'LIKE_NEW',
      conditionSlug: 'nhu-moi',
    });
  });
  it('bỏ qua giá trị rác, mảng và tình trạng khi danh mục không có tình trạng', () => {
    const apparel = { categoryId: 'cat_apparel', categorySlug: 'quan-ao', hasCondition: false };
    expect(parseShopFilters({ c: 'abc', cond: 'moi' }, categories)).toEqual({});
    expect(parseShopFilters({ c: ['quan-ao', 'mu'] }, categories)).toEqual(apparel);
    expect(parseShopFilters({ c: 'quan-ao', cond: 'moi' }, categories)).toEqual(apparel);
    expect(parseShopFilters({}, categories)).toEqual({});
  });
});

describe('buildShopWhere', () => {
  it('luôn lọc Shop đang bán, thêm danh mục/tình trạng khi có', () => {
    expect(buildShopWhere({})).toEqual({ status: 'ACTIVE' });
    expect(buildShopWhere({ categoryId: 'cat_tech', condition: 'USED' })).toEqual({
      status: 'ACTIVE',
      categoryId: 'cat_tech',
      condition: 'USED',
    });
  });
});
