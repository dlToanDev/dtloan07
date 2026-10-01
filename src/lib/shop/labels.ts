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

export const ORDER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
  EXPIRED: 'Đã hết hạn',
};

export function paymentStatusLabel(status?: string | null): string {
  if (!status) return '';
  return ORDER_PAYMENT_STATUS_LABELS[status] ?? status;
}

export function paymentStatusBadgeVariant(
  status?: string | null,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'PAID':
      return 'default';
    case 'PENDING':
      return 'outline';
    case 'FAILED':
    case 'EXPIRED':
      return 'destructive';
    case 'REFUNDED':
      return 'secondary';
    default:
      return 'outline';
  }
}

export const ORDER_FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export function fulfillmentStatusLabel(status?: string | null): string {
  if (!status) return '';
  return ORDER_FULFILLMENT_STATUS_LABELS[status] ?? status;
}

export const SUBSCRIBER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  UNSUBSCRIBED: 'Đã hủy đăng ký',
};

export function subscriberStatusLabel(status?: string | null): string {
  if (!status) return '';
  return SUBSCRIBER_STATUS_LABELS[status] ?? status;
}
