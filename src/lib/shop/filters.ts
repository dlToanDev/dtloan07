import type { Prisma } from '@prisma/client';
import {
  CONDITION_OPTIONS,
  SHOP_CATEGORY_OPTIONS,
  type ItemConditionValue,
  type ShopCategoryValue,
} from '@/lib/shop/labels';

export interface ShopFilters {
  category?: ShopCategoryValue;
  categorySlug?: string;
  condition?: ItemConditionValue;
  conditionSlug?: string;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Đọc query `?c=` và `?cond=`; giá trị rác bị bỏ qua thay vì làm lỗi trang. */
export function parseShopFilters(
  params: Record<string, string | string[] | undefined>,
): ShopFilters {
  const category = SHOP_CATEGORY_OPTIONS.find((option) => option.slug === first(params.c));
  if (!category) return {};
  const filters: ShopFilters = { category: category.value, categorySlug: category.slug };
  if (category.value === 'TECH') {
    const condition = CONDITION_OPTIONS.find((option) => option.slug === first(params.cond));
    if (condition) {
      filters.condition = condition.value;
      filters.conditionSlug = condition.slug;
    }
  }
  return filters;
}

export function buildShopWhere(filters: ShopFilters): Prisma.ProductWhereInput {
  return {
    status: 'ACTIVE',
    kind: 'SHOP',
    ...(filters.category && { category: filters.category }),
    ...(filters.condition && { condition: filters.condition }),
  };
}
