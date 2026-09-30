/**
 * Tỷ giá quy đổi tham chiếu: 1 USD = 25,972 VND
 */
export const USD_TO_VND_RATE = 25972;

export interface DepositLinkResult {
  success: boolean;
  checkoutUrl?: string;
  orderCode?: string;
  numericOrderCode?: number;
  qrCode?: string;
  qrImageUrl?: string;
  bin?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  amountVnd?: number;
  description?: string;
  depositCurrency?: 'VND' | 'USD';
  depositAmount?: number;
  isMock?: boolean;
  error?: string;
}

export interface CheckDepositStatusResult {
  success: boolean;
  status?: string;
  isPaid?: boolean;
  depositCurrency?: string | null;
  depositAmount?: number | null;
  totalVnd?: number;
  newBalanceVnd?: number;
  newBalanceUsd?: number;
  error?: string;
}

export interface InstantDepositResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ExchangeCurrencyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface WithdrawFundsParams {
  currency: 'VND' | 'USD';
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  note?: string;
}

export interface WithdrawFundsResult {
  success: boolean;
  message?: string;
  error?: string;
  newBalanceVnd?: number;
  newBalanceUsd?: number;
}

export const POPULAR_BANKS = [
  'MB Bank (Quân Đội)',
  'Vietcombank (Ngoại thương)',
  'Techcombank (Kỹ thương)',
  'VietinBank (Công thương)',
  'BIDV (Đầu tư & Phát triển)',
  'VPBank (Việt Nam Thịnh Vượng)',
  'ACB (Á Châu)',
  'TPBank (Tiên Phong)',
  'Agribank (Nông nghiệp)',
  'SHB (Sài Gòn - Hà Nội)',
  'HDBank',
  'MSB (Hàng Hải)',
  'Sacombank',
  'VIB (Quốc tế)',
  'OCB (Phương Đông)',
  'SeABank',
  'Ngân hàng khác',
] as const;

export interface WalletTransactionItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  orderCode: string | null;
  description: string | null;
  createdAt: Date;
}

export interface WalletData {
  balanceVnd: number;
  balanceUsd: number;
  transactions: WalletTransactionItem[];
}
