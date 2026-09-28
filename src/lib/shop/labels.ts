export type ProductTypeOption = 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
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
  {
    value: 'DOWNLOAD',
    label: '💻 Source code',
    hint: 'App, tool, template… khách tải file sau khi mua',
  },
];

export const CONDITION_OPTIONS: { value: ItemConditionValue; slug: string; label: string }[] = [
  { value: 'NEW', slug: 'moi', label: 'Mới' },
  { value: 'LIKE_NEW', slug: 'nhu-moi', label: 'Như mới' },
  { value: 'USED', slug: 'da-dung', label: 'Đã dùng' },
];

export function conditionLabel(value: string | null | undefined) {
  return CONDITION_OPTIONS.find((option) => option.value === value)?.label ?? '';
}
