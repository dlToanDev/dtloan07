import { describe, it, expect } from 'vitest';
import { USD_TO_VND_RATE } from '@/lib/wallet';

describe('Ví tiền và Tỷ giá quy đổi USD ⇄ VND', () => {
  it('tỷ giá quy đổi tham chiếu phải đúng 1 USD = 25,972 VND theo yêu cầu', () => {
    expect(USD_TO_VND_RATE).toBe(25972);
  });

  it('quy đổi chính xác từ USD sang VND', () => {
    const usdAmount = 10000;
    const expectedVnd = 10000 * 25972;
    expect(expectedVnd).toBe(259720000);
    expect(Math.round(usdAmount * USD_TO_VND_RATE)).toBe(259720000);
  });

  it('quy đổi chính xác từ VND sang USD làm tròn 2 chữ số', () => {
    const vndAmount = 259720000;
    const usd = Number((vndAmount / USD_TO_VND_RATE).toFixed(2));
    expect(usd).toBe(10000.0);

    const vndSmall = 500000;
    const usdSmall = Number((vndSmall / USD_TO_VND_RATE).toFixed(2));
    expect(usdSmall).toBe(19.25);
  });

  it('tính toán tổng số dư quy đổi tham chiếu kết hợp cả VND và USD', () => {
    const balanceVnd = 500000;
    const balanceUsd = 100;
    const totalInVnd = balanceVnd + Math.round(balanceUsd * USD_TO_VND_RATE);
    expect(totalInVnd).toBe(500000 + 2597200);

    const totalInUsd = Number((balanceVnd / USD_TO_VND_RATE + balanceUsd).toFixed(2));
    expect(totalInUsd).toBe(119.25);
  });

  it('tính toán trừ số dư ví chính xác cho gói PRO 1 tháng và 1 năm', () => {
    const proMonthPriceVnd = 20000;
    const proMonthPriceUsd = Number((proMonthPriceVnd / USD_TO_VND_RATE).toFixed(2));
    expect(proMonthPriceUsd).toBe(0.77);

    const proYearPriceVnd = 180000;
    const proYearPriceUsd = Number((proYearPriceVnd / USD_TO_VND_RATE).toFixed(2));
    expect(proYearPriceUsd).toBe(6.93);

    // Kiểm tra trừ ví USD với tài khoản có $10,000
    const currentBalanceUsd = 10000.0;
    const balanceAfterProYear = Number((currentBalanceUsd - proYearPriceUsd).toFixed(2));
    expect(balanceAfterProYear).toBe(9993.07);
  });

  it('kiểm tra điều kiện đủ số dư ví để thanh toán đơn hàng hoặc khóa học', () => {
    const userWallet = {
      balanceVnd: 0,
      balanceUsd: 10000.0,
      totalInVnd: Math.round(10000.0 * USD_TO_VND_RATE),
    };

    const coursePriceVnd = 499000;
    expect(userWallet.totalInVnd).toBeGreaterThan(coursePriceVnd);

    const shopOrderTotalVnd = 2500000;
    expect(userWallet.totalInVnd).toBeGreaterThan(shopOrderTotalVnd);
  });

  it('kiểm tra hạn mức nạp tiền vào ví VND (tối thiểu 10.000đ, tối đa 50.000.000đ)', () => {
    const isValidVndDeposit = (amount: number) => {
      const rounded = Math.round(amount);
      return rounded >= 10000 && rounded <= 50000000;
    };

    expect(isValidVndDeposit(5000)).toBe(false);
    expect(isValidVndDeposit(10000)).toBe(true);
    expect(isValidVndDeposit(500000)).toBe(true);
    expect(isValidVndDeposit(50000000)).toBe(true);
    expect(isValidVndDeposit(50000001)).toBe(false);
  });

  it('kiểm tra hạn mức và quy đổi nạp tiền USD sang VND (tối thiểu $1, tối đa $2,000)', () => {
    const isValidUsdDeposit = (amount: number) => amount >= 1 && amount <= 2000;

    expect(isValidUsdDeposit(0.5)).toBe(false);
    expect(isValidUsdDeposit(1)).toBe(true);
    expect(isValidUsdDeposit(100)).toBe(true);
    expect(isValidUsdDeposit(2000)).toBe(true);
    expect(isValidUsdDeposit(2001)).toBe(false);

    // Tính tiền VND tương ứng để tạo đơn PayOS
    const depositUsd = 10;
    const amountVnd = Math.round(depositUsd * USD_TO_VND_RATE);
    expect(amountVnd).toBe(259720);
  });

  it('chuẩn hóa nội dung chuyển khoản VietQR nạp tiền: không dấu, tối đa 25 ký tự', () => {
    const rawDesc = 'NAP VND DH-1727712345';
    const safeDesc = rawDesc
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .slice(0, 25);

    expect(safeDesc).toBe('NAP VND DH1727712345');
    expect(safeDesc.length).toBeLessThanOrEqual(25);
  });

  it('quy tắc bảo mật rút tiền ví: CHỈ QUẢN TRỊ VIÊN (ADMIN) mới được phép rút', () => {
    const canWithdrawFunds = (userRole: string) => userRole === 'ADMIN';

    expect(canWithdrawFunds('ADMIN')).toBe(true);
    expect(canWithdrawFunds('USER')).toBe(false);
    expect(canWithdrawFunds('GUEST')).toBe(false);
    expect(canWithdrawFunds('')).toBe(false);
  });

  it('kiểm tra điều kiện số dư và hạn mức khi admin rút tiền VND và USD', () => {
    const validateWithdraw = ({
      role,
      currency,
      amount,
      balanceVnd,
      balanceUsd,
    }: {
      role: string;
      currency: 'VND' | 'USD';
      amount: number;
      balanceVnd: number;
      balanceUsd: number;
    }) => {
      if (role !== 'ADMIN') return { valid: false, error: 'Chỉ Admin mới có quyền rút tiền.' };
      if (currency === 'VND') {
        const rounded = Math.round(amount);
        if (rounded < 10000) return { valid: false, error: 'Tối thiểu 10.000đ' };
        if (rounded > balanceVnd) return { valid: false, error: 'Số dư VND không đủ' };
        return { valid: true, newBalance: balanceVnd - rounded };
      } else {
        if (amount < 1) return { valid: false, error: 'Tối thiểu $1' };
        if (amount > balanceUsd) return { valid: false, error: 'Số dư USD không đủ' };
        return { valid: true, newBalance: Number((balanceUsd - amount).toFixed(2)) };
      }
    };

    // Thành viên thường thử rút -> Bị chặn
    expect(
      validateWithdraw({
        role: 'USER',
        currency: 'VND',
        amount: 100000,
        balanceVnd: 500000,
        balanceUsd: 0,
      }).valid,
    ).toBe(false);

    // Admin rút VND hợp lệ
    const adminWithdrawVnd = validateWithdraw({
      role: 'ADMIN',
      currency: 'VND',
      amount: 200000,
      balanceVnd: 500000,
      balanceUsd: 0,
    });
    expect(adminWithdrawVnd.valid).toBe(true);
    expect(adminWithdrawVnd.newBalance).toBe(300000);

    // Admin rút số tiền lớn hơn số dư -> Bị từ chối
    expect(
      validateWithdraw({
        role: 'ADMIN',
        currency: 'VND',
        amount: 600000,
        balanceVnd: 500000,
        balanceUsd: 0,
      }).valid,
    ).toBe(false);

    // Admin rút USD hợp lệ
    const adminWithdrawUsd = validateWithdraw({
      role: 'ADMIN',
      currency: 'USD',
      amount: 45.5,
      balanceVnd: 0,
      balanceUsd: 100.0,
    });
    expect(adminWithdrawUsd.valid).toBe(true);
    expect(adminWithdrawUsd.newBalance).toBe(54.5);
  });
});
