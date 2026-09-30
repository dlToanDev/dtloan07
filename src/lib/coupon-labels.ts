export type VoucherTypeValue = 'PERCENT' | 'FIXED' | 'FREE_SHIP';

export const VOUCHER_TYPE_OPTIONS: { value: VoucherTypeValue; label: string; hint: string }[] = [
  { value: 'FIXED', label: '💵 Giảm tiền', hint: 'Trừ thẳng một số tiền, vd. 50.000 đ' },
  { value: 'PERCENT', label: '🏷️ Giảm %', hint: 'Giảm theo phần trăm, có thể đặt mức tối đa' },
  { value: 'FREE_SHIP', label: '🚚 Free ship', hint: 'Miễn phí vận chuyển cho hàng cần giao' },
];

const money = (vnd: number) => `${vnd.toLocaleString('vi-VN')} đ`;

/** Mô tả ngắn mức giảm: "Giảm 10% (tối đa 50.000 đ)", "Miễn phí ship". */
export function describeVoucher(voucher: {
  type: VoucherTypeValue;
  value: number;
  maxDiscountVnd?: number | null;
  minOrderVnd?: number;
}) {
  const main =
    voucher.type === 'PERCENT'
      ? `Giảm ${voucher.value}%${voucher.maxDiscountVnd ? ` (tối đa ${money(voucher.maxDiscountVnd)})` : ''}`
      : voucher.type === 'FIXED'
        ? `Giảm ${money(voucher.value)}`
        : voucher.value > 0
          ? `Miễn phí ship tới ${money(voucher.value)}`
          : 'Miễn phí ship';
  return voucher.minOrderVnd ? `${main} · đơn từ ${money(voucher.minOrderVnd)}` : main;
}

/** Trạng thái hiển thị theo ngày và lượt: đang chạy / sắp diễn ra / hết hạn / hết lượt / đã tắt. */
export function voucherStatus(
  voucher: {
    active: boolean;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    maxUses: number | null;
    usedCount: number;
  },
  now = new Date(),
) {
  if (!voucher.active) return { label: 'Đã tắt', tone: 'muted' as const };
  if (voucher.endsAt && new Date(voucher.endsAt) < now)
    return { label: 'Hết hạn', tone: 'muted' as const };
  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses)
    return { label: 'Hết lượt', tone: 'muted' as const };
  if (voucher.startsAt && new Date(voucher.startsAt) > now)
    return { label: 'Sắp diễn ra', tone: 'pending' as const };
  return { label: 'Đang chạy', tone: 'active' as const };
}
