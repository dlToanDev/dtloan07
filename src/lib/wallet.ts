/**
 * Tỷ giá quy đổi tham chiếu: 1 USD = 25,972 VND
 */
export const USD_TO_VND_RATE = 25972;

export interface DepositLinkResult {
  success: boolean;
  checkoutUrl?: string;
  orderCode?: string;
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
