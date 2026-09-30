import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { CouponRule } from '@/lib/pricing';
import { isUserPro } from '@/lib/membership-db';

export interface ResolvedCoupon {
  couponId: string;
  /** Có khi khách nhập mã riêng (CouponGrant). */
  grantId: string | null;
  perUserLimit: number | null;
  /** Voucher bí mật chỉ tài khoản Pro dùng được. */
  proOnly: boolean;
  rule: CouponRule;
}

export type CouponLookup = { ok: true; coupon: ResolvedCoupon } | { ok: false; error: string };

const couponInclude = { categories: { select: { id: true } } } as const;

type CouponWithCategories = Prisma.CouponGetPayload<{ include: typeof couponInclude }>;

function toRule(coupon: CouponWithCategories, code: string): CouponRule {
  return {
    code,
    type: coupon.type,
    value: coupon.value,
    maxDiscountVnd: coupon.maxDiscountVnd,
    minOrderVnd: coupon.minOrderVnd,
    scope: coupon.scope,
    categoryIds: coupon.categories.map((category) => category.id),
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    active: coupon.active,
  };
}

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

/** Khách đã dùng mã công khai của voucher bao nhiêu lần (theo tài khoản hoặc email). */
async function publicUses(
  client: Prisma.TransactionClient,
  couponId: string,
  who: { userId?: string | null; email?: string | null },
) {
  const or: Prisma.CouponRedemptionWhereInput[] = [];
  if (who.userId) or.push({ userId: who.userId });
  if (who.email) or.push({ email: { equals: who.email, mode: 'insensitive' } });
  if (or.length === 0) return 0;
  return client.couponRedemption.count({ where: { couponId, grantId: null, OR: or } });
}

/**
 * Tìm voucher theo mã khách nhập: mã riêng (CouponGrant) trước, rồi mã công khai.
 * Chỉ kiểm tra quyền dùng mã; điều kiện giá (hạn, danh mục, đơn tối thiểu) do calculatePricing xét.
 */
export async function findCouponByCode(
  rawCode: string,
  who: { userId?: string | null; email?: string | null },
): Promise<CouponLookup> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false, error: 'Vui lòng nhập mã giảm giá.' };
  const result = await lookupCode(code, who);
  if (!result.ok) return result;

  // Luật riêng cho tài khoản Pro — chỉ đọc hạn Pro khi voucher cần tới.
  const { rule } = result.coupon;
  if (result.coupon.proOnly || rule.type === 'FREE_SHIP') {
    const pro = await isUserPro(who.userId);
    if (result.coupon.proOnly && !pro)
      return { ok: false, error: 'Mã này chỉ dành cho tài khoản Pro.' };
    if (rule.type === 'FREE_SHIP' && pro)
      return {
        ok: false,
        error: 'Tài khoản Pro đã luôn được miễn phí ship — hãy giữ mã này cho lần khác.',
      };
  }
  return result;
}

async function lookupCode(
  code: string,
  who: { userId?: string | null; email?: string | null },
): Promise<CouponLookup> {
  const grant = await db.couponGrant.findUnique({
    where: { code },
    include: { coupon: { include: couponInclude } },
  });
  if (grant) {
    if (!who.userId)
      return { ok: false, error: 'Đây là mã riêng — vui lòng đăng nhập tài khoản đã nhận mã.' };
    if (grant.userId !== who.userId) return { ok: false, error: 'Mã này thuộc về tài khoản khác.' };
    if (grant.usedAt) return { ok: false, error: 'Mã này đã được sử dụng.' };
    return {
      ok: true,
      coupon: {
        couponId: grant.couponId,
        grantId: grant.id,
        perUserLimit: null,
        proOnly: grant.coupon.proOnly,
        rule: toRule(grant.coupon, code),
      },
    };
  }

  const coupon = await db.coupon.findUnique({ where: { code }, include: couponInclude });
  if (!coupon) return { ok: false, error: 'Mã giảm giá không tồn tại.' };
  if (coupon.perUserLimit !== null && (await publicUses(db, coupon.id, who)) >= coupon.perUserLimit)
    return { ok: false, error: 'Bạn đã dùng hết lượt của mã giảm giá này.' };
  return {
    ok: true,
    coupon: {
      couponId: coupon.id,
      grantId: null,
      perUserLimit: coupon.perUserLimit,
      proOnly: coupon.proOnly,
      rule: toRule(coupon, code),
    },
  };
}

/** Lỗi voucher ném ra trong transaction để rollback cả đơn (giống lỗi hết hàng `STOCK:`). */
export class CouponReserveError extends Error {}

/**
 * Giữ một lượt dùng voucher cho đơn vừa tạo. Gọi trong `db.$transaction`, cùng lúc giữ kho.
 * UPDATE có điều kiện khóa dòng Coupon, nên hai đơn cùng lúc không thể vượt tổng lượt
 * hay lượt mỗi người: đơn đến sau chờ khóa rồi đếm lại.
 */
export async function reserveCoupon(
  tx: Prisma.TransactionClient,
  input: {
    coupon: ResolvedCoupon;
    orderId: string;
    userId: string | null;
    email: string;
    discountVnd: number;
  },
) {
  const { coupon } = input;
  const taken = await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
    WHERE "id" = ${coupon.couponId} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;
  if (taken === 0) throw new CouponReserveError('Mã giảm giá vừa hết lượt sử dụng.');

  if (coupon.grantId) {
    const used = await tx.couponGrant.updateMany({
      where: { id: coupon.grantId, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (used.count === 0) throw new CouponReserveError('Mã này đã được sử dụng.');
  } else if (coupon.perUserLimit !== null) {
    const uses = await publicUses(tx, coupon.couponId, {
      userId: input.userId,
      email: input.email,
    });
    if (uses >= coupon.perUserLimit)
      throw new CouponReserveError('Bạn đã dùng hết lượt của mã giảm giá này.');
  }

  await tx.couponRedemption.create({
    data: {
      couponId: coupon.couponId,
      grantId: coupon.grantId,
      orderId: input.orderId,
      userId: input.userId,
      email: input.email.toLowerCase(),
      discountVnd: input.discountVnd,
    },
  });
}

/**
 * Trả lượt voucher của đơn hết hạn / bị hủy: xóa lượt dùng, trả lượt tổng, mở lại mã riêng.
 * Gọi một lần khi đơn rời trạng thái giữ hàng (cùng chỗ trả tồn kho).
 */
export async function releaseCouponForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (!redemption) return false;
  await tx.couponRedemption.delete({ where: { id: redemption.id } });
  await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${redemption.couponId}
  `;
  if (redemption.grantId)
    await tx.couponGrant.update({ where: { id: redemption.grantId }, data: { usedAt: null } });
  return true;
}

/**
 * Đơn đã thanh toán nhưng chưa có lượt dùng (đơn tạo trước khi có bảng lượt dùng, hoặc đơn
 * hết hạn rồi khách vẫn chuyển khoản): ghi nhận lại, không chặn vì tiền đã nhận.
 */
export async function ensureRedemptionForPaidOrder(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    couponId: string | null;
    userId: string | null;
    email: string;
    discountVnd: number;
    shippingDiscountVnd: number;
  },
) {
  if (!order.couponId) return;
  const existing = await tx.couponRedemption.findUnique({ where: { orderId: order.id } });
  if (existing) return;
  await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
  await tx.couponRedemption.create({
    data: {
      couponId: order.couponId,
      orderId: order.id,
      userId: order.userId,
      email: order.email.toLowerCase(),
      discountVnd: order.discountVnd + order.shippingDiscountVnd,
    },
  });
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0/O, 1/I dễ nhầm

/** Mã riêng ngẫu nhiên dạng HVP-7K2QX9. */
export function generateGrantCode(prefix = 'HVP') {
  let body = '';
  for (let i = 0; i < 6; i++) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${prefix}-${body}`;
}
