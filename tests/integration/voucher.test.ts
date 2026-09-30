/**
 * Test tích hợp voucher trên PostgreSQL thật: giữ / trả lượt, giới hạn mỗi người, mã riêng.
 * Chạy bằng `pnpm test:int` sau `pnpm prisma migrate deploy`.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { CouponLookup } from '@/lib/coupons';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'x', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const coupons = await import('@/lib/coupons');
const { saveVoucher, grantVoucher, revokeGrant, deleteVoucher } =
  await import('@/server/actions/voucher');

const PREFIX = 'it-voucher-';
const OWNER = { id: `${PREFIX}owner`, email: `${PREFIX}owner@example.com` };
const OTHER = { id: `${PREFIX}other`, email: `${PREFIX}other@example.com` };
const CATEGORY_ID = `${PREFIX}cat`;

async function makeOrder(email = OWNER.email, userId: string | null = OWNER.id) {
  return db.order.create({
    data: {
      orderCode: `IT-V-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email,
      userId,
      status: 'PENDING',
      subtotalVnd: 100000,
      discountVnd: 10000,
      totalVnd: 90000,
      provider: 'PAYOS',
    },
  });
}

async function voucher(patch: Record<string, unknown> = {}) {
  const result = await saveVoucher({
    name: 'IT voucher',
    code: '',
    type: 'PERCENT',
    value: 10,
    maxDiscountVnd: null,
    minOrderVnd: null,
    scope: 'ALL',
    categoryIds: [],
    maxUses: null,
    perUserLimit: null,
    startsAt: null,
    endsAt: null,
    active: true,
    ...patch,
  });
  if (!result.ok) throw new Error(result.error);
  return result.data.id;
}

async function reserve(
  lookup: CouponLookup,
  order: { id: string; email: string; userId: string | null },
) {
  if (!lookup.ok) throw new Error(lookup.error);
  return db.$transaction((tx) =>
    coupons.reserveCoupon(tx, {
      coupon: lookup.coupon,
      orderId: order.id,
      userId: order.userId,
      email: order.email,
      discountVnd: 10000,
    }),
  );
}

const usedCount = async (id: string) =>
  (await db.coupon.findUniqueOrThrow({ where: { id } })).usedCount;

async function cleanup() {
  await db.order.deleteMany({ where: { orderCode: { startsWith: 'IT-V-' } } });
  await db.coupon.deleteMany({ where: { name: { startsWith: 'IT voucher' } } });
  await db.user.deleteMany({ where: { id: { in: [OWNER.id, OTHER.id] } } });
  await db.productCategory.deleteMany({ where: { id: CATEGORY_ID } });
}

beforeAll(async () => {
  await cleanup();
  await db.user.createMany({ data: [OWNER, OTHER] });
  await db.productCategory.create({
    data: { id: CATEGORY_ID, name: 'IT Voucher danh mục', slug: `${PREFIX}cat` },
  });
}, 60_000);

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
}, 60_000);

describe('lưu voucher', () => {
  it('chuẩn hóa mã, lưu danh mục, bắt lỗi dữ liệu và mã trùng', async () => {
    const id = await voucher({
      code: ' it-sale10 ',
      scope: 'CATEGORIES',
      categoryIds: [CATEGORY_ID],
    });
    const saved = await db.coupon.findUniqueOrThrow({
      where: { id },
      include: { categories: true },
    });
    expect(saved.code).toBe('IT-SALE10');
    expect(saved.categories.map((category) => category.id)).toEqual([CATEGORY_ID]);

    const dup = await saveVoucher({ ...baseInput(), code: 'it-sale10' });
    expect(dup.ok).toBe(false);
    const noCategory = await saveVoucher({ ...baseInput(), scope: 'CATEGORIES' });
    expect(noCategory).toMatchObject({ ok: false, error: expect.stringContaining('danh mục') });
    const badPercent = await saveVoucher({ ...baseInput(), value: 150 });
    expect(badPercent).toMatchObject({ ok: false, error: expect.stringContaining('1 đến 100') });
  });
});

function baseInput() {
  return {
    name: 'IT voucher',
    code: '',
    type: 'PERCENT' as const,
    value: 10,
    maxDiscountVnd: null,
    minOrderVnd: null,
    scope: 'ALL' as const,
    categoryIds: [],
    maxUses: null,
    perUserLimit: null,
    startsAt: null,
    endsAt: null,
    active: true,
  };
}

describe('giữ và trả lượt', () => {
  it('hết tổng lượt thì đơn sau bị từ chối; đơn hết hạn trả lượt lại', async () => {
    const id = await voucher({ code: 'IT-ONCE', maxUses: 1 });
    const first = await makeOrder();
    await reserve(await coupons.findCouponByCode('it-once', { userId: OWNER.id }), first);
    expect(await usedCount(id)).toBe(1);

    const second = await makeOrder(OTHER.email, OTHER.id);
    const lookup = await coupons.findCouponByCode('IT-ONCE', { userId: OTHER.id });
    await expect(reserve(lookup, second)).rejects.toThrow('hết lượt');
    expect(await db.couponRedemption.count({ where: { orderId: second.id } })).toBe(0);

    await db.$transaction((tx) => coupons.releaseCouponForOrder(tx, first.id));
    expect(await usedCount(id)).toBe(0);
    await reserve(lookup, second);
    expect(await usedCount(id)).toBe(1);
  });

  it('mỗi người dùng mã công khai tối đa N lần, tính cả theo email khi chưa đăng nhập', async () => {
    await voucher({ code: 'IT-PERUSER', perUserLimit: 1 });
    await reserve(
      await coupons.findCouponByCode('IT-PERUSER', { userId: OWNER.id }),
      await makeOrder(),
    );

    const again = await coupons.findCouponByCode('IT-PERUSER', { userId: OWNER.id });
    expect(again).toMatchObject({ ok: false, error: expect.stringContaining('hết lượt') });
    // Khách vãng lai dùng lại đúng email đó cũng bị chặn.
    const guest = await coupons.findCouponByCode('IT-PERUSER', {
      email: OWNER.email.toUpperCase(),
    });
    expect(guest.ok).toBe(false);
  });

  it('hai đơn cùng lúc tranh lượt cuối: chỉ một đơn giữ được', async () => {
    const id = await voucher({ code: 'IT-RACE', maxUses: 1 });
    const lookup = await coupons.findCouponByCode('IT-RACE', {});
    const [a, b] = await Promise.all([makeOrder(), makeOrder(OTHER.email, OTHER.id)]);
    const results = await Promise.allSettled([reserve(lookup, a), reserve(lookup, b)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await usedCount(id)).toBe(1);
  });

  it('đơn đã thanh toán mà chưa có lượt dùng thì webhook ghi bù', async () => {
    const id = await voucher({ code: 'IT-LATE' });
    const order = await db.order.update({
      where: { id: (await makeOrder()).id },
      data: { couponId: id, status: 'PAID' },
    });
    await db.$transaction((tx) => coupons.ensureRedemptionForPaidOrder(tx, order));
    await db.$transaction((tx) => coupons.ensureRedemptionForPaidOrder(tx, order));
    expect(await usedCount(id)).toBe(1);
    expect(await db.couponRedemption.count({ where: { orderId: order.id } })).toBe(1);
  });
});

describe('mã riêng', () => {
  it('chỉ chủ mã dùng được, dùng một lần, trả lại khi đơn hủy, thu hồi khi chưa dùng', async () => {
    const id = await voucher({ name: 'IT voucher riêng' });
    const noAccount = await grantVoucher({ couponId: id, email: 'khong-ton-tai@example.com' });
    expect(noAccount).toMatchObject({
      ok: false,
      error: expect.stringContaining('chưa có tài khoản'),
    });

    const granted = await grantVoucher({ couponId: id, email: OWNER.email.toUpperCase() });
    if (!granted.ok) throw new Error(granted.error);
    expect(granted.data.code).toMatch(/^HVP-[A-Z2-9]{6}$/);
    const code = granted.data.code.toLowerCase();

    expect(await coupons.findCouponByCode(code, {})).toMatchObject({
      ok: false,
      error: expect.stringContaining('đăng nhập'),
    });
    expect(await coupons.findCouponByCode(code, { userId: OTHER.id })).toMatchObject({
      ok: false,
      error: expect.stringContaining('tài khoản khác'),
    });

    const order = await makeOrder();
    await reserve(await coupons.findCouponByCode(code, { userId: OWNER.id }), order);
    expect(await coupons.findCouponByCode(code, { userId: OWNER.id })).toMatchObject({
      ok: false,
      error: expect.stringContaining('đã được sử dụng'),
    });
    expect(await revokeGrant(granted.data.id)).toMatchObject({ ok: false });
    expect(await deleteVoucher(id)).toMatchObject({ ok: false });

    await db.$transaction((tx) => coupons.releaseCouponForOrder(tx, order.id));
    expect((await coupons.findCouponByCode(code, { userId: OWNER.id })).ok).toBe(true);
    expect(await revokeGrant(granted.data.id)).toEqual({ ok: true, data: undefined });
  });
});
