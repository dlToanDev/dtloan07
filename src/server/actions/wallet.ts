'use server';

import crypto from 'node:crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createPayOSPaymentLink } from '@/lib/payments/payos';
import { siteConfig } from '@/config/site';
import { revalidatePath } from 'next/cache';
import {
  USD_TO_VND_RATE,
  type DepositLinkResult,
  type InstantDepositResult,
  type ExchangeCurrencyResult,
  type CheckDepositStatusResult,
  type WithdrawFundsParams,
  type WithdrawFundsResult,
} from '@/lib/wallet';
import { PRO_PLANS, type MembershipPlanValue } from '@/lib/membership';
import { grantProDays } from '@/lib/membership-db';

/**
 * Tạo link thanh toán PayOS để nạp tiền vào ví (hỗ trợ VND hoặc USD quy đổi)
 */
export async function createDepositPaymentLink(
  currency: 'VND' | 'USD',
  amount: number,
): Promise<DepositLinkResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện nạp tiền.' };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return { success: false, error: 'Không tìm thấy thông tin tài khoản.' };
  }

  let amountVnd = 0;
  if (currency === 'VND') {
    const rounded = Math.round(amount);
    if (rounded < 10000 || rounded > 50000000) {
      return {
        success: false,
        error: 'Số tiền nạp VND tối thiểu là 10.000 đ và tối đa 50.000.000 đ.',
      };
    }
    amountVnd = rounded;
  } else {
    if (amount < 1 || amount > 2000) {
      return { success: false, error: 'Số tiền nạp USD tối thiểu là $1 và tối đa $2,000.' };
    }
    amountVnd = Math.round(amount * USD_TO_VND_RATE);
  }

  try {
    const randomSuffix = crypto.randomInt(10, 100);
    const numericOrderCode = Number(`${Math.floor(Date.now() / 1000)}${randomSuffix}`);
    const orderCode = `DH-${numericOrderCode}`;

    await db.order.create({
      data: {
        orderCode,
        userId: user.id,
        email: user.email,
        customerName: user.name,
        status: 'PENDING',
        subtotalVnd: amountVnd,
        totalVnd: amountVnd,
        provider: 'PAYOS',
        paymentMethod: 'PAYOS',
        depositCurrency: currency,
        depositAmount: amount,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút
      },
    });

    const payos = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: amountVnd,
      description: `NAP ${currency} ${orderCode}`,
      items: [
        {
          name: `Nạp ${currency === 'USD' ? `$${amount}` : `${amount.toLocaleString('vi-VN')} đ`} vào ví`,
          quantity: 1,
          price: amountVnd,
        },
      ],
      returnUrl: `${siteConfig.url}/account?tab=wallet&order=${orderCode}&status=success`,
      cancelUrl: `${siteConfig.url}/account?tab=wallet&cancelled=1`,
    });

    return {
      success: true,
      checkoutUrl: payos.checkoutUrl,
      orderCode,
      numericOrderCode,
      qrCode: payos.qrCode,
      qrImageUrl: payos.qrImageUrl,
      bin: payos.bin,
      bankName: payos.bankName,
      accountNumber: payos.accountNumber,
      accountName: payos.accountName,
      amountVnd,
      description: payos.description || `NAP ${currency} ${orderCode}`,
      depositCurrency: currency,
      depositAmount: amount,
      isMock: payos.isMock,
    };
  } catch (error) {
    console.error('Lỗi khi tạo link nạp tiền PayOS:', error);
    return { success: false, error: 'Không thể tạo phiên nạp tiền. Vui lòng thử lại sau.' };
  }
}

/**
 * Kiểm tra trạng thái đơn nạp tiền trong ví theo thời gian thực (dùng cho polling QR modal)
 */
export async function checkDepositOrderStatus(
  orderCode: string,
): Promise<CheckDepositStatusResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập.' };
  }

  try {
    const order = await db.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        orderCode: true,
        userId: true,
        status: true,
        depositCurrency: true,
        depositAmount: true,
        totalVnd: true,
        paidAt: true,
      },
    });

    if (!order || order.userId !== userId) {
      return { success: false, error: 'Không tìm thấy giao dịch nạp tiền.' };
    }

    let newBalanceVnd: number | undefined;
    let newBalanceUsd: number | undefined;

    if (order.status === 'PAID') {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { balanceVnd: true, balanceUsd: true },
      });
      if (user) {
        newBalanceVnd = user.balanceVnd;
        newBalanceUsd = user.balanceUsd;
      }
    }

    return {
      success: true,
      status: order.status,
      isPaid: order.status === 'PAID',
      depositCurrency: order.depositCurrency,
      depositAmount: order.depositAmount,
      totalVnd: order.totalVnd,
      newBalanceVnd,
      newBalanceUsd,
    };
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái đơn nạp tiền:', error);
    return { success: false, error: 'Lỗi kiểm tra trạng thái đơn.' };
  }
}

/**
 * Giả lập thanh toán VietQR thành công trong môi trường Dev/Mock
 */
export async function simulateMockDepositSuccess(
  orderCode: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập.' };
  }

  try {
    const order = await db.order.findUnique({
      where: { orderCode },
    });

    if (!order || order.userId !== userId) {
      return { success: false, error: 'Không tìm thấy đơn nạp tiền.' };
    }

    if (order.status === 'PAID') {
      return { success: true, message: 'Đơn nạp tiền đã được ghi nhận trước đó.' };
    }

    const currency = order.depositCurrency || 'VND';
    const isUsd = currency === 'USD';
    const depositAmount =
      order.depositAmount || (isUsd ? order.totalVnd / USD_TO_VND_RATE : order.totalVnd);

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Không tìm thấy tài khoản người dùng.');

      const balanceBefore = isUsd ? user.balanceUsd : user.balanceVnd;
      const balanceAfter = balanceBefore + depositAmount;

      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(isUsd ? { balanceUsd: balanceAfter } : { balanceVnd: Math.round(balanceAfter) }),
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: depositAmount,
          currency,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          orderCode: order.orderCode,
          description: `Nạp tiền vào ví (${currency}) qua VietQR (Mock Demo)`,
        },
      });
    });

    revalidatePath('/account');
    return { success: true, message: 'Nạp tiền vào ví thành công!' };
  } catch (error) {
    console.error('Lỗi khi giả lập nạp tiền thành công:', error);
    return { success: false, error: 'Không thể xử lý giả lập nạp tiền.' };
  }
}

/**
 * Nạp tiền trực tiếp vào ví (phục vụ kiểm thử, demo hoặc quản trị viên nạp nhanh)
 */
export async function instantDepositWallet(
  currency: 'VND' | 'USD',
  amount: number,
  note?: string,
): Promise<InstantDepositResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện.' };
  }

  const isUsd = currency === 'USD';

  if (isUsd) {
    if (amount <= 0 || amount > 5000) {
      return { success: false, error: 'Số tiền nạp USD phải lớn hơn 0 và tối đa $5,000.' };
    }
  } else {
    if (amount < 10000 || amount > 100000000) {
      return {
        success: false,
        error: 'Số tiền nạp VND tối thiểu là 10.000 đ và tối đa 100.000.000 đ.',
      };
    }
  }

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balanceVnd: true, balanceUsd: true },
      });

      if (!user) throw new Error('Không tìm thấy tài khoản.');

      const balanceBefore = isUsd ? user.balanceUsd : user.balanceVnd;
      const balanceAfter = balanceBefore + amount;

      await tx.user.update({
        where: { id: userId },
        data: {
          ...(isUsd
            ? { balanceUsd: Number(balanceAfter.toFixed(2)) }
            : { balanceVnd: Math.round(balanceAfter) }),
        },
      });

      const orderCode = `NAP-${Date.now().toString().slice(-6)}`;

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          currency,
          balanceBefore,
          balanceAfter: isUsd ? Number(balanceAfter.toFixed(2)) : Math.round(balanceAfter),
          status: 'COMPLETED',
          orderCode,
          description:
            note ||
            `Nạp tiền vào ví (${currency}): +${
              isUsd ? `$${amount}` : `${amount.toLocaleString('vi-VN')} đ`
            }`,
        },
      });
    });

    revalidatePath('/account');
    return {
      success: true,
      message: `Nạp thành công ${isUsd ? `$${amount}` : `${amount.toLocaleString('vi-VN')} đ`} vào ví tài khoản!`,
    };
  } catch (error) {
    console.error('Lỗi nạp tiền vào ví:', error);
    return { success: false, error: 'Không thể xử lý nạp tiền. Vui lòng thử lại.' };
  }
}

/**
 * Quy đổi tiền tệ qua lại giữa USD và VND theo tỷ giá chuẩn (1 USD = 25,972 VND)
 */
export async function exchangeWalletCurrency(
  direction: 'USD_TO_VND' | 'VND_TO_USD',
  amount: number,
): Promise<ExchangeCurrencyResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện quy đổi tiền.' };
  }

  if (amount <= 0) {
    return { success: false, error: 'Số tiền quy đổi phải lớn hơn 0.' };
  }

  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balanceVnd: true, balanceUsd: true },
      });

      if (!user) throw new Error('Không tìm thấy tài khoản người dùng.');

      if (direction === 'USD_TO_VND') {
        if (user.balanceUsd < amount) {
          return {
            success: false,
            error: `Số dư USD không đủ. Bạn hiện có $${user.balanceUsd.toFixed(2)} USD.`,
          };
        }

        const receivedVnd = Math.round(amount * USD_TO_VND_RATE);
        const newBalanceUsd = Number((user.balanceUsd - amount).toFixed(2));
        const newBalanceVnd = user.balanceVnd + receivedVnd;

        await tx.user.update({
          where: { id: userId },
          data: {
            balanceUsd: newBalanceUsd,
            balanceVnd: newBalanceVnd,
          },
        });

        const orderCode = `EX-${Date.now().toString().slice(-6)}`;
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'DEPOSIT',
            amount: receivedVnd,
            currency: 'VND',
            balanceBefore: user.balanceVnd,
            balanceAfter: newBalanceVnd,
            status: 'COMPLETED',
            orderCode,
            description: `Quy đổi tiền tệ: -$${amount.toFixed(2)} USD ➔ +${receivedVnd.toLocaleString('vi-VN')} đ (Tỷ giá: 1 USD = 25.972 đ)`,
          },
        });

        revalidatePath('/account');
        return {
          success: true,
          message: `Quy đổi thành công $${amount.toFixed(2)} USD sang ${receivedVnd.toLocaleString('vi-VN')} đ!`,
        };
      } else {
        const roundedAmountVnd = Math.round(amount);
        if (user.balanceVnd < roundedAmountVnd) {
          return {
            success: false,
            error: `Số dư VND không đủ. Bạn hiện có ${user.balanceVnd.toLocaleString('vi-VN')} đ.`,
          };
        }

        const receivedUsd = Number((roundedAmountVnd / USD_TO_VND_RATE).toFixed(2));
        if (receivedUsd <= 0) {
          return {
            success: false,
            error: `Số tiền VND quá nhỏ để quy đổi ra tối thiểu $0.01 USD.`,
          };
        }

        const newBalanceVnd = user.balanceVnd - roundedAmountVnd;
        const newBalanceUsd = Number((user.balanceUsd + receivedUsd).toFixed(2));

        await tx.user.update({
          where: { id: userId },
          data: {
            balanceVnd: newBalanceVnd,
            balanceUsd: newBalanceUsd,
          },
        });

        const orderCode = `EX-${Date.now().toString().slice(-6)}`;
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'DEPOSIT',
            amount: receivedUsd,
            currency: 'USD',
            balanceBefore: user.balanceUsd,
            balanceAfter: newBalanceUsd,
            status: 'COMPLETED',
            orderCode,
            description: `Quy đổi tiền tệ: -${roundedAmountVnd.toLocaleString('vi-VN')} đ ➔ +$${receivedUsd.toFixed(2)} USD (Tỷ giá: 1 USD = 25.972 đ)`,
          },
        });

        revalidatePath('/account');
        return {
          success: true,
          message: `Quy đổi thành công ${roundedAmountVnd.toLocaleString('vi-VN')} đ sang $${receivedUsd.toFixed(2)} USD!`,
        };
      }
    });
  } catch (error) {
    console.error('Lỗi quy đổi tiền tệ ví:', error);
    return { success: false, error: 'Không thể quy đổi tiền tệ. Vui lòng thử lại.' };
  }
}

/**
 * Rút tiền từ ví về tài khoản ngân hàng (CHỈ DÀNH RIÊNG CHO QUẢN TRỊ VIÊN - ADMIN)
 */
export async function withdrawWalletFunds(
  params: WithdrawFundsParams,
): Promise<WithdrawFundsResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thực hiện rút tiền.' };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, balanceVnd: true, balanceUsd: true },
  });

  if (!user) {
    return { success: false, error: 'Không tìm thấy thông tin tài khoản người dùng.' };
  }

  // CHỈ RIÊNG ADMIN MỚI ĐƯỢC RÚT TIỀN
  if (user.role !== 'ADMIN') {
    return {
      success: false,
      error:
        'Tính năng rút tiền về tài khoản ngân hàng hiện chỉ dành riêng cho Quản trị viên (Admin). Tài khoản thành viên tạm thời chưa được hỗ trợ rút tiền.',
    };
  }

  const { currency, amount, bankName, accountNumber, accountName, note } = params;

  if (!bankName?.trim()) {
    return { success: false, error: 'Vui lòng chọn hoặc nhập tên ngân hàng thụ hưởng.' };
  }

  const cleanAccountNumber = accountNumber?.trim().replace(/\s+/g, '');
  if (!cleanAccountNumber || cleanAccountNumber.length < 5) {
    return { success: false, error: 'Số tài khoản ngân hàng không hợp lệ (tối thiểu 5 ký tự).' };
  }

  const cleanAccountName = accountName?.trim().toUpperCase();
  if (!cleanAccountName || cleanAccountName.length < 2) {
    return { success: false, error: 'Vui lòng nhập tên chủ tài khoản thụ hưởng.' };
  }

  const isUsd = currency === 'USD';

  if (isUsd) {
    if (amount < 1) {
      return { success: false, error: 'Số tiền rút USD tối thiểu là $1.' };
    }
    if (user.balanceUsd < amount) {
      return {
        success: false,
        error: `Số dư USD không đủ để rút. Bạn hiện có $${user.balanceUsd.toFixed(2)} USD.`,
      };
    }
  } else {
    const roundedAmount = Math.round(amount);
    if (roundedAmount < 10000) {
      return { success: false, error: 'Số tiền rút VND tối thiểu là 10.000 đ.' };
    }
    if (user.balanceVnd < roundedAmount) {
      return {
        success: false,
        error: `Số dư VND không đủ để rút. Bạn hiện có ${user.balanceVnd.toLocaleString('vi-VN')} đ.`,
      };
    }
  }

  try {
    return await db.$transaction(async (tx) => {
      // Đọc lại dữ liệu mới nhất trong transaction
      const freshUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, balanceVnd: true, balanceUsd: true },
      });

      if (!freshUser || freshUser.role !== 'ADMIN') {
        throw new Error('Chỉ tài khoản Quản trị viên (Admin) mới có quyền rút tiền.');
      }

      let balanceBefore = 0;
      let balanceAfter = 0;
      let withdrawAmount = 0;

      if (isUsd) {
        withdrawAmount = Number(amount.toFixed(2));
        if (freshUser.balanceUsd < withdrawAmount) {
          throw new Error(
            `Số dư USD không đủ để rút. Bạn hiện có $${freshUser.balanceUsd.toFixed(2)} USD.`,
          );
        }
        balanceBefore = freshUser.balanceUsd;
        balanceAfter = Number((freshUser.balanceUsd - withdrawAmount).toFixed(2));

        await tx.user.update({
          where: { id: userId },
          data: { balanceUsd: balanceAfter },
        });
      } else {
        withdrawAmount = Math.round(amount);
        if (freshUser.balanceVnd < withdrawAmount) {
          throw new Error(
            `Số dư VND không đủ để rút. Bạn hiện có ${freshUser.balanceVnd.toLocaleString('vi-VN')} đ.`,
          );
        }
        balanceBefore = freshUser.balanceVnd;
        balanceAfter = freshUser.balanceVnd - withdrawAmount;

        await tx.user.update({
          where: { id: userId },
          data: { balanceVnd: balanceAfter },
        });
      }

      const orderCode = `RUT-${Date.now().toString().slice(-6)}`;
      const desc = `Rút tiền về ${bankName.trim()} (${cleanAccountNumber} - ${cleanAccountName})${note?.trim() ? ` - ${note.trim()}` : ''}`;

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: withdrawAmount,
          currency,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          orderCode,
          description: desc,
        },
      });

      revalidatePath('/account');
      return {
        success: true,
        message: `Đã thực hiện rút thành công ${isUsd ? `$${withdrawAmount}` : `${withdrawAmount.toLocaleString('vi-VN')} đ`} về tài khoản ${bankName.trim()} (${cleanAccountNumber})!`,
        newBalanceVnd: isUsd ? freshUser.balanceVnd : balanceAfter,
        newBalanceUsd: isUsd ? balanceAfter : freshUser.balanceUsd,
      };
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Không thể thực hiện rút tiền. Vui lòng thử lại sau.';
    console.error('Lỗi khi xử lý rút tiền ví:', error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Lấy số dư ví hiện tại của người dùng đang đăng nhập
 */
export async function getCurrentUserWallet() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { balanceVnd: true, balanceUsd: true },
  });

  if (!user) return null;
  return {
    balanceVnd: user.balanceVnd,
    balanceUsd: user.balanceUsd,
    totalInVnd: user.balanceVnd + Math.round(user.balanceUsd * USD_TO_VND_RATE),
    totalInUsd: Number((user.balanceVnd / USD_TO_VND_RATE + user.balanceUsd).toFixed(2)),
  };
}

/**
 * Mua/Nâng cấp gói PRO bằng số dư ví tài khoản (trừ trực tiếp VND hoặc USD)
 */
export async function purchaseProWithWallet(
  planKey: MembershipPlanValue,
  preferredCurrency?: 'VND' | 'USD',
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để nâng cấp gói PRO.' };
  }

  const plan = PRO_PLANS[planKey];
  if (!plan) {
    return { success: false, error: 'Gói PRO không hợp lệ.' };
  }

  const priceVnd = plan.priceVnd;
  const priceUsd = Number((priceVnd / USD_TO_VND_RATE).toFixed(2));

  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, balanceVnd: true, balanceUsd: true },
      });

      if (!user) throw new Error('Không tìm thấy tài khoản người dùng.');

      const totalAvailableVnd = user.balanceVnd + Math.round(user.balanceUsd * USD_TO_VND_RATE);
      if (totalAvailableVnd < priceVnd) {
        return {
          success: false,
          error: `Số dư ví không đủ. Cần ${priceVnd.toLocaleString('vi-VN')} đ (Khả dụng: ${totalAvailableVnd.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền hoặc chọn thanh toán PayOS.`,
        };
      }

      let newBalanceVnd = user.balanceVnd;
      let newBalanceUsd = user.balanceUsd;
      let currencyDeducted: 'VND' | 'USD' = 'VND';
      let amountDeducted = priceVnd;
      let balanceBefore = user.balanceVnd;
      let balanceAfter = user.balanceVnd;

      const useUsd =
        preferredCurrency === 'USD' || (user.balanceUsd >= priceUsd && user.balanceVnd < priceVnd);

      if (useUsd) {
        if (user.balanceUsd < priceUsd) {
          return {
            success: false,
            error: `Số dư USD không đủ. Cần $${priceUsd} USD (Hiện có: $${user.balanceUsd.toFixed(2)} USD).`,
          };
        }
        newBalanceUsd = Number((user.balanceUsd - priceUsd).toFixed(2));
        currencyDeducted = 'USD';
        amountDeducted = priceUsd;
        balanceBefore = user.balanceUsd;
        balanceAfter = newBalanceUsd;
      } else {
        if (user.balanceVnd >= priceVnd) {
          newBalanceVnd = user.balanceVnd - priceVnd;
          balanceBefore = user.balanceVnd;
          balanceAfter = newBalanceVnd;
        } else {
          const remainingVnd = priceVnd - user.balanceVnd;
          const usdToDeduct = Number((remainingVnd / USD_TO_VND_RATE).toFixed(2));
          newBalanceVnd = 0;
          newBalanceUsd = Number((user.balanceUsd - usdToDeduct).toFixed(2));
          balanceBefore = user.balanceVnd;
          balanceAfter = 0;
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          balanceVnd: newBalanceVnd,
          balanceUsd: newBalanceUsd,
        },
      });

      await grantProDays(tx, userId, plan.days);

      const orderCode = `PRO-${Date.now().toString().slice(-6)}`;
      const order = await tx.order.create({
        data: {
          orderCode,
          userId,
          email: user.email,
          customerName: user.name,
          status: 'PAID',
          subtotalVnd: priceVnd,
          totalVnd: priceVnd,
          provider: 'WALLET',
          paymentMethod: 'WALLET',
          membershipPlan: planKey,
          paidAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          providerEventId: `wallet-pro-${orderCode}`,
          amountVnd: priceVnd,
          signatureValid: true,
          rawPayload: { provider: 'WALLET' },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'PAYMENT',
          amount: amountDeducted,
          currency: currencyDeducted,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          orderCode,
          description: `Thanh toán nâng cấp ${plan.label} bằng Ví tài khoản (-${
            currencyDeducted === 'USD'
              ? `$${amountDeducted}`
              : `${amountDeducted.toLocaleString('vi-VN')} đ`
          })`,
        },
      });

      revalidatePath('/account');
      revalidatePath('/pro');
      return {
        success: true,
        message: `Kích hoạt thành công ${plan.label}! Bạn đã có đặc quyền PRO ngay lập tức.`,
      };
    });
  } catch (error) {
    console.error('Lỗi thanh toán PRO bằng ví:', error);
    return { success: false, error: 'Không thể thanh toán gói PRO bằng ví. Vui lòng thử lại.' };
  }
}

/**
 * Đăng ký / Mua khóa học bằng số dư ví tài khoản
 */
export async function purchaseCourseWithWallet(
  courseId: string,
  preferredCurrency?: 'VND' | 'USD',
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để đăng ký khóa học.' };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, priceVnd: true, status: true },
  });

  if (!course || course.status !== 'ACTIVE') {
    return { success: false, error: 'Khóa học không khả dụng.' };
  }

  if (course.priceVnd <= 0) {
    await db.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });
    revalidatePath(`/courses/${course.slug}`);
    return { success: true, message: 'Đăng ký khóa học thành công!' };
  }

  const priceVnd = course.priceVnd;
  const priceUsd = Number((priceVnd / USD_TO_VND_RATE).toFixed(2));

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing) {
        return { success: true, message: 'Bạn đã đăng ký khóa học này trước đó.' };
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, balanceVnd: true, balanceUsd: true },
      });
      if (!user) throw new Error('Không tìm thấy tài khoản người dùng.');

      const totalAvailableVnd = user.balanceVnd + Math.round(user.balanceUsd * USD_TO_VND_RATE);
      if (totalAvailableVnd < priceVnd) {
        return {
          success: false,
          error: `Số dư ví không đủ. Cần ${priceVnd.toLocaleString('vi-VN')} đ (Khả dụng: ${totalAvailableVnd.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền hoặc chọn thanh toán PayOS.`,
        };
      }

      let newBalanceVnd = user.balanceVnd;
      let newBalanceUsd = user.balanceUsd;
      let currencyDeducted: 'VND' | 'USD' = 'VND';
      let amountDeducted = priceVnd;
      let balanceBefore = user.balanceVnd;
      let balanceAfter = user.balanceVnd;

      const useUsd =
        preferredCurrency === 'USD' || (user.balanceUsd >= priceUsd && user.balanceVnd < priceVnd);

      if (useUsd) {
        if (user.balanceUsd < priceUsd) {
          return {
            success: false,
            error: `Số dư USD không đủ. Cần $${priceUsd} USD (Hiện có: $${user.balanceUsd.toFixed(2)} USD).`,
          };
        }
        newBalanceUsd = Number((user.balanceUsd - priceUsd).toFixed(2));
        currencyDeducted = 'USD';
        amountDeducted = priceUsd;
        balanceBefore = user.balanceUsd;
        balanceAfter = newBalanceUsd;
      } else {
        if (user.balanceVnd >= priceVnd) {
          newBalanceVnd = user.balanceVnd - priceVnd;
          balanceBefore = user.balanceVnd;
          balanceAfter = newBalanceVnd;
        } else {
          const remainingVnd = priceVnd - user.balanceVnd;
          const usdToDeduct = Number((remainingVnd / USD_TO_VND_RATE).toFixed(2));
          newBalanceVnd = 0;
          newBalanceUsd = Number((user.balanceUsd - usdToDeduct).toFixed(2));
          balanceBefore = user.balanceVnd;
          balanceAfter = 0;
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          balanceVnd: newBalanceVnd,
          balanceUsd: newBalanceUsd,
        },
      });

      await tx.enrollment.create({
        data: {
          userId,
          courseId,
        },
      });

      const orderCode = `KH-${Date.now().toString().slice(-6)}`;
      const order = await tx.order.create({
        data: {
          orderCode,
          userId,
          email: user.email,
          customerName: user.name,
          status: 'PAID',
          subtotalVnd: priceVnd,
          totalVnd: priceVnd,
          provider: 'WALLET',
          paymentMethod: 'WALLET',
          courseId,
          paidAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          providerEventId: `wallet-course-${orderCode}`,
          amountVnd: priceVnd,
          signatureValid: true,
          rawPayload: { provider: 'WALLET' },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'PAYMENT',
          amount: amountDeducted,
          currency: currencyDeducted,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED',
          orderCode,
          description: `Đăng ký khóa học: ${course.title} (-${
            currencyDeducted === 'USD'
              ? `$${amountDeducted}`
              : `${amountDeducted.toLocaleString('vi-VN')} đ`
          })`,
        },
      });

      revalidatePath(`/courses/${course.slug}`);
      revalidatePath('/account');
      return {
        success: true,
        message: `Đăng ký thành công khóa học "${course.title}"! Bạn có thể vào học ngay.`,
      };
    });
  } catch (error) {
    console.error('Lỗi đăng ký khóa học bằng ví:', error);
    return { success: false, error: 'Không thể xử lý đăng ký khóa học. Vui lòng thử lại.' };
  }
}

/**
 * Tạo link thanh toán PayOS (VietQR) cho Khóa học trả phí
 */
export async function createCoursePayOSPaymentLink(courseId: string): Promise<DepositLinkResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Vui lòng đăng nhập để thanh toán khóa học.' };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, priceVnd: true, status: true },
  });

  if (!course || course.status !== 'ACTIVE' || course.priceVnd <= 0) {
    return { success: false, error: 'Khóa học không hợp lệ.' };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return { success: false, error: 'Không tìm thấy thông tin tài khoản.' };
  }

  try {
    const randomSuffix = crypto.randomInt(10, 100);
    const numericOrderCode = Number(`${Math.floor(Date.now() / 1000)}${randomSuffix}`);
    const orderCode = `DH-${numericOrderCode}`;

    await db.order.create({
      data: {
        orderCode,
        userId: user.id,
        email: user.email,
        customerName: user.name,
        status: 'PENDING',
        subtotalVnd: course.priceVnd,
        totalVnd: course.priceVnd,
        provider: 'PAYOS',
        paymentMethod: 'PAYOS',
        courseId: course.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const payos = await createPayOSPaymentLink({
      orderCode: numericOrderCode,
      amount: course.priceVnd,
      description: `KHOA HOC ${orderCode}`,
      items: [
        {
          name: course.title.slice(0, 50),
          quantity: 1,
          price: course.priceVnd,
        },
      ],
      returnUrl: `${siteConfig.url}/courses/${course.slug}?orderCode=${orderCode}&status=success`,
      cancelUrl: `${siteConfig.url}/courses/${course.slug}?cancelled=1`,
    });

    return {
      success: true,
      checkoutUrl: payos.checkoutUrl,
      orderCode,
    };
  } catch (error) {
    console.error('Lỗi tạo link PayOS khóa học:', error);
    return { success: false, error: 'Không thể tạo phiên thanh toán PayOS. Vui lòng thử lại.' };
  }
}
