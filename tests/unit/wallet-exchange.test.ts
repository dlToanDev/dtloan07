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

    const totalInUsd = Number(((balanceVnd / USD_TO_VND_RATE) + balanceUsd).toFixed(2));
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
});
