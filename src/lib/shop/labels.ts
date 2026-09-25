export type ProductTypeOption = 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
export type ShopCategoryValue =
  'APPAREL' | 'HAT' | 'MUG' | 'ACCESSORY' | 'TECH' | 'ACCOUNT' | 'OTHER';
export type ItemConditionValue = 'NEW' | 'LIKE_NEW' | 'USED';

export const PRODUCT_TYPE_OPTIONS: { value: ProductTypeOption; label: string; hint: string }[] = [
  {
    value: 'PHYSICAL',
    label: '👕 Đồ vật lý',
    hint: 'Quần áo, mũ, cốc, đồ công nghệ… cần giao hàng',
  },
  {
    value: 'ACCOUNT',
    label: '🔑 Tài khoản số',
    hint: 'Netflix, Codex… bàn giao thông tin đăng nhập',
  },
  { value: 'DOWNLOAD', label: '📦 File tải về', hint: 'Ebook, template, file số' },
];

export const SHOP_CATEGORY_OPTIONS: { value: ShopCategoryValue; slug: string; label: string }[] = [
  { value: 'APPAREL', slug: 'quan-ao', label: 'Quần áo' },
  { value: 'HAT', slug: 'mu', label: 'Mũ' },
  { value: 'MUG', slug: 'coc', label: 'Cốc' },
  { value: 'ACCESSORY', slug: 'phu-kien', label: 'Phụ kiện' },
  { value: 'TECH', slug: 'do-cong-nghe', label: 'Đồ công nghệ' },
  { value: 'ACCOUNT', slug: 'tai-khoan', label: 'Tài khoản' },
  { value: 'OTHER', slug: 'khac', label: 'Khác' },
];

export const CONDITION_OPTIONS: { value: ItemConditionValue; slug: string; label: string }[] = [
  { value: 'NEW', slug: 'moi', label: 'Mới' },
  { value: 'LIKE_NEW', slug: 'nhu-moi', label: 'Như mới' },
  { value: 'USED', slug: 'da-dung', label: 'Đã dùng' },
];

export function categoryLabel(value: string | null | undefined) {
  return SHOP_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

export function conditionLabel(value: string | null | undefined) {
  return CONDITION_OPTIONS.find((option) => option.value === value)?.label ?? '';
}
