'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { generateGrantCode, normalizeCouponCode } from '@/lib/coupons';
import { requireProductAdmin } from '@/server/actions/product';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const optionalInt = (max: number, message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number().int(message).min(0, message).max(max, message).nullable(),
  );

const optionalDate = z.preprocess(
  (value) => (value ? new Date(String(value)) : null),
  z.date({ invalid_type_error: 'Ngày không hợp lệ.' }).nullable(),
);

const voucherSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'Nhập tên voucher.').max(100),
    code: z
      .string()
      .trim()
      .max(30)
      .transform(normalizeCouponCode)
      .refine((code) => code === '' || /^[A-Z0-9_-]{3,30}$/.test(code), {
        message: 'Mã chỉ gồm chữ không dấu, số, "-" hoặc "_" (3–30 ký tự).',
      }),
    type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIP']),
    value: z.coerce.number().int().min(0),
    maxDiscountVnd: optionalInt(2147483647, 'Mức giảm tối đa không hợp lệ.'),
    minOrderVnd: optionalInt(2147483647, 'Đơn tối thiểu không hợp lệ.'),
    scope: z.enum(['ALL', 'CATEGORIES']),
    categoryIds: z.array(z.string()).max(100).default([]),
    maxUses: optionalInt(10_000_000, 'Số lượng không hợp lệ.'),
    perUserLimit: optionalInt(1000, 'Lượt mỗi người không hợp lệ.'),
    startsAt: optionalDate,
    endsAt: optionalDate,
    active: z.boolean(),
    proOnly: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string, path: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
    if (data.type === 'PERCENT' && (data.value < 1 || data.value > 100))
      issue('Phần trăm giảm từ 1 đến 100.', 'value');
    if (data.type === 'FIXED' && data.value < 1000)
      issue('Số tiền giảm tối thiểu 1.000 đ.', 'value');
    if (data.scope === 'CATEGORIES' && data.categoryIds.length === 0)
      issue('Chọn ít nhất một danh mục áp dụng.', 'categoryIds');
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt)
      issue('Ngày kết thúc phải sau ngày bắt đầu.', 'endsAt');
  });

export type VoucherInput = z.input<typeof voucherSchema>;

function revalidateVouchers(id?: string) {
  revalidatePath('/admin/vouchers');
  if (id) revalidatePath(`/admin/vouchers/${id}`);
}

export async function saveVoucher(input: VoucherInput): Promise<Result<{ id: string }>> {
  await requireProductAdmin();
  const parsed = voucherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]!.message };
  const { id, categoryIds, code, ...data } = parsed.data;

  const existing = id ? await db.coupon.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, error: 'Không tìm thấy voucher.' };
  if (existing && data.maxUses !== null && data.maxUses < existing.usedCount)
    return {
      ok: false,
      error: `Voucher đã dùng ${existing.usedCount} lượt, số lượng không được nhỏ hơn.`,
    };
  // Mã công khai không được trùng mã riêng đã phát (tra mã riêng trước sẽ "che" mã công khai).
  if (code && (await db.couponGrant.findUnique({ where: { code }, select: { id: true } })))
    return { ok: false, error: `Mã ${code} đã được dùng làm mã riêng.` };

  const fields = {
    ...data,
    code: code || null,
    maxDiscountVnd: data.type === 'PERCENT' ? data.maxDiscountVnd : null,
    minOrderVnd: data.minOrderVnd ?? 0,
  };
  const categories = data.scope === 'CATEGORIES' ? categoryIds.map((cid) => ({ id: cid })) : [];

  try {
    const saved = existing
      ? await db.coupon.update({
          where: { id: existing.id },
          data: { ...fields, categories: { set: categories } },
        })
      : await db.coupon.create({ data: { ...fields, categories: { connect: categories } } });
    revalidateVouchers(saved.id);
    return { ok: true, data: { id: saved.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return { ok: false, error: `Mã ${code} đã có voucher khác dùng.` };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
      return { ok: false, error: 'Danh mục đã chọn không còn tồn tại. Hãy tải lại trang.' };
    throw error;
  }
}

export async function setVoucherActive(id: string, active: boolean): Promise<Result> {
  await requireProductAdmin();
  await db.coupon.update({ where: { id }, data: { active } });
  revalidateVouchers(id);
  return { ok: true, data: undefined };
}

export async function deleteVoucher(id: string): Promise<Result> {
  await requireProductAdmin();
  const uses = await db.couponRedemption.count({ where: { couponId: id } });
  const orders = await db.order.count({ where: { couponId: id } });
  if (uses > 0 || orders > 0)
    return { ok: false, error: 'Voucher đã có đơn sử dụng — hãy tắt thay vì xóa để giữ lịch sử.' };
  await db.coupon.delete({ where: { id } });
  revalidateVouchers();
  return { ok: true, data: undefined };
}

export interface GrantView {
  id: string;
  code: string;
  email: string;
  source: string;
  note: string | null;
  usedAt: string | null;
  createdAt: string;
}

/** Tặng mã riêng cho một tài khoản (theo email đăng nhập). */
export async function grantVoucher(input: {
  couponId: string;
  email: string;
  note?: string;
}): Promise<Result<GrantView>> {
  await requireProductAdmin();
  const email = z.string().trim().email('Email không hợp lệ.').safeParse(input.email);
  if (!email.success) return { ok: false, error: email.error.errors[0]!.message };
  const user = await db.user.findFirst({
    where: { email: { equals: email.data, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user)
    return { ok: false, error: 'Email này chưa có tài khoản — khách cần đăng ký/đăng nhập trước.' };
  const coupon = await db.coupon.findUnique({
    where: { id: input.couponId },
    select: { id: true },
  });
  if (!coupon) return { ok: false, error: 'Không tìm thấy voucher.' };

  // Mã ngẫu nhiên 6 ký tự: trùng rất hiếm, thử lại vài lần là đủ.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGrantCode();
    if (await db.coupon.findUnique({ where: { code }, select: { id: true } })) continue;
    try {
      const grant = await db.couponGrant.create({
        data: {
          couponId: coupon.id,
          userId: user.id,
          code,
          source: 'ADMIN',
          note: input.note?.trim().slice(0, 200) || null,
        },
      });
      revalidateVouchers(coupon.id);
      revalidatePath('/account');
      return {
        ok: true,
        data: {
          id: grant.id,
          code: grant.code,
          email: user.email ?? email.data,
          source: grant.source,
          note: grant.note,
          usedAt: null,
          createdAt: grant.createdAt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
      throw error;
    }
  }
  return { ok: false, error: 'Không tạo được mã, vui lòng thử lại.' };
}

export async function revokeGrant(grantId: string): Promise<Result> {
  await requireProductAdmin();
  const grant = await db.couponGrant.findUnique({ where: { id: grantId } });
  if (!grant) return { ok: false, error: 'Không tìm thấy mã.' };
  if (grant.usedAt) return { ok: false, error: 'Mã đã được dùng, không thu hồi được.' };
  await db.couponGrant.delete({ where: { id: grantId } });
  revalidateVouchers(grant.couponId);
  revalidatePath('/account');
  return { ok: true, data: undefined };
}

/**
 * Tặng mỗi tài khoản Pro đang còn hạn một mã riêng của voucher.
 * Bỏ qua người đang giữ mã chưa dùng của voucher này, nên bấm lại không phát trùng.
 */
export async function grantVoucherToAllPro(couponId: string): Promise<Result<GrantView[]>> {
  await requireProductAdmin();
  const coupon = await db.coupon.findUnique({ where: { id: couponId }, select: { id: true } });
  if (!coupon) return { ok: false, error: 'Không tìm thấy voucher.' };

  const users = await db.user.findMany({
    where: {
      proUntil: { gt: new Date() },
      couponGrants: { none: { couponId, usedAt: null } },
    },
    select: { id: true, email: true },
  });

  const created: GrantView[] = [];
  for (const user of users) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const grant = await db.couponGrant.create({
          data: {
            couponId,
            userId: user.id,
            code: generateGrantCode(),
            source: 'ADMIN',
            note: 'Quà Pro',
          },
        });
        created.push({
          id: grant.id,
          code: grant.code,
          email: user.email,
          source: grant.source,
          note: grant.note,
          usedAt: null,
          createdAt: grant.createdAt.toISOString(),
        });
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
          continue;
        throw error;
      }
    }
  }
  revalidateVouchers(couponId);
  revalidatePath('/account');
  return { ok: true, data: created };
}

/**
 * Phát thông báo hệ thống kèm Voucher gửi riêng đến tất cả tài khoản PRO.
 * Chỉ ai nâng cấp PRO mới nhìn thấy thông báo này trong chuông và banner!
 */
export async function broadcastVoucherToPro(
  couponId: string,
  options?: { customTitle?: string; customContent?: string; showBanner?: boolean },
): Promise<Result<{ announcementId: string }>> {
  await requireProductAdmin();
  const coupon = await db.coupon.findUnique({
    where: { id: couponId },
  });
  if (!coupon) return { ok: false, error: 'Không tìm thấy voucher.' };

  const discountText =
    coupon.type === 'PERCENT'
      ? `Giảm ${coupon.value}%${coupon.maxDiscountVnd ? ` (tối đa ${coupon.maxDiscountVnd.toLocaleString('vi-VN')}đ)` : ''}`
      : coupon.type === 'FIXED'
        ? `Giảm ${coupon.value.toLocaleString('vi-VN')}đ`
        : 'Miễn phí vận chuyển';

  const title =
    options?.customTitle?.trim() ||
    `👑 Đặc quyền PRO: Voucher ${coupon.name || coupon.code || discountText}`;
  const content =
    options?.customContent?.trim() ||
    `Tài khoản PRO của bạn nhận được mã ưu đãi đặc biệt: ${coupon.code || 'Mã ưu đãi'} (${discountText}). Áp dụng ngay khi mua sắm tại Shop!`;

  try {
    const announcement = await db.systemAnnouncement.create({
      data: {
        title,
        content,
        type: 'VOUCHER',
        badge: '👑 Dành riêng PRO',
        linkUrl: '/shop',
        linkText: 'Dùng voucher ngay',
        voucherCode: coupon.code,
        voucherDiscount: discountText,
        voucherExpires: coupon.endsAt,
        proOnly: true,
        showBanner: options?.showBanner ?? true,
        isActive: true,
      },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/vouchers');

    return { ok: true, data: { announcementId: announcement.id } };
  } catch (err) {
    console.error('Lỗi phát thông báo PRO voucher:', err);
    return { ok: false, error: 'Không thể tạo thông báo cho voucher này.' };
  }
}
