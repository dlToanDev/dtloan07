import type { Prisma } from '@prisma/client';
import { CONDITION_OPTIONS, type ItemConditionValue } from '@/lib/shop/labels';

export interface ShopFilters {
  categoryId?: string;
  categorySlug?: string;
  /** Danh mục đang lọc có chọn tình trạng máy (Mới / Như mới / Đã dùng). */
  hasCondition?: boolean;
  condition?: ItemConditionValue;
  conditionSlug?: string;
}

export interface FilterCategory {
  id: string;
  slug: string;
  hasCondition: boolean;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Đọc query `?c=` và `?cond=`; giá trị rác bị bỏ qua thay vì làm lỗi trang. */
export function parseShopFilters(
  params: Record<string, string | string[] | undefined>,
  categories: FilterCategory[],
): ShopFilters {
  const category = categories.find((option) => option.slug === first(params.c));
  if (!category) return {};
  const filters: ShopFilters = {
    categoryId: category.id,
    categorySlug: category.slug,
    hasCondition: category.hasCondition,
  };
  if (category.hasCondition) {
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
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.condition && { condition: filters.condition }),
  };
}
