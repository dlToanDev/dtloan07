/**
 * Test tích hợp gói Pro trên PostgreSQL thật: cộng hạn Pro, voucher chỉ Pro, tặng mã cho Pro.
 * Chạy bằng `pnpm test:int` sau `pnpm prisma migrate deploy`.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'x', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { grantProDays, isUserPro } = await import('@/lib/membership-db');
const { findCouponByCode } = await import('@/lib/coupons');
const { grantVoucherToAllPro } = await import('@/server/actions/voucher');

const DAY = 24 * 60 * 60 * 1000;
const PRO = { id: 'it-pro-member', email: 'it-pro-member@example.com' };
const BASIC = { id: 'it-pro-basic', email: 'it-pro-basic@example.com' };

async function cleanup() {
  await db.coupon.deleteMany({ where: { name: { startsWith: 'IT Pro' } } });
  await db.user.deleteMany({ where: { id: { in: [PRO.id, BASIC.id] } } });
}

const proUntil = async (id: string) =>
  (await db.user.findUniqueOrThrow({ where: { id }, select: { proUntil: true } })).proUntil;

beforeAll(async () => {
  await cleanup();
  await db.user.createMany({ data: [PRO, BASIC] });
}, 60_000);

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
}, 60_000);

describe('cộng hạn Pro', () => {
  it('chưa Pro → tính từ bây giờ; còn hạn → cộng dồn; mua cùng lúc không mất ngày', async () => {
    const before = Date.now();
    await db.$transaction((tx) => grantProDays(tx, PRO.id, 30));
    const first = (await proUntil(PRO.id))!.getTime();
    expect(first - before).toBeGreaterThan(30 * DAY - 60_000);
    expect(first - before).toBeLessThan(30 * DAY + 60_000);
    expect(await isUserPro(PRO.id)).toBe(true);

    await Promise.all([
      db.$transaction((tx) => grantProDays(tx, PRO.id, 30)),
      db.$transaction((tx) => grantProDays(tx, PRO.id, 365)),
    ]);
    const after = (await proUntil(PRO.id))!.getTime();
    expect(Math.round((after - first) / DAY)).toBe(395);
  });

  it('đã hết hạn thì tính lại từ bây giờ, không cộng vào ngày cũ', async () => {
    await db.user.update({
      where: { id: BASIC.id },
      data: { proUntil: new Date(Date.now() - 10 * DAY) },
    });
    expect(await isUserPro(BASIC.id)).toBe(false);
    await db.$transaction((tx) => grantProDays(tx, BASIC.id, 30));
    const until = (await proUntil(BASIC.id))!.getTime();
    expect(Math.round((until - Date.now()) / DAY)).toBe(30);
    await db.user.update({ where: { id: BASIC.id }, data: { proUntil: null } });
  });
});

describe('voucher và tài khoản Pro', () => {
  it('voucher chỉ Pro: tài khoản thường bị từ chối, Pro dùng được', async () => {
    await db.coupon.create({
      data: {
        name: 'IT Pro secret',
        code: 'IT-PROSECRET',
        type: 'PERCENT',
        value: 20,
        proOnly: true,
      },
    });
    expect(await findCouponByCode('it-prosecret', { userId: BASIC.id })).toMatchObject({
      ok: false,
      error: expect.stringContaining('chỉ dành cho tài khoản Pro'),
    });
    expect(await findCouponByCode('it-prosecret', {})).toMatchObject({ ok: false });
    expect((await findCouponByCode('it-prosecret', { userId: PRO.id })).ok).toBe(true);
  });

  it('Pro không cần dùng mã free ship (đã luôn miễn ship)', async () => {
    await db.coupon.create({
      data: { name: 'IT Pro freeship', code: 'IT-FREESHIP', type: 'FREE_SHIP', value: 0 },
    });
    expect(await findCouponByCode('IT-FREESHIP', { userId: PRO.id })).toMatchObject({
      ok: false,
      error: expect.stringContaining('miễn phí ship'),
    });
    expect((await findCouponByCode('IT-FREESHIP', { userId: BASIC.id })).ok).toBe(true);
  });

  it('tặng cho tất cả Pro: chỉ Pro còn hạn nhận, bấm lại không phát trùng', async () => {
    const coupon = await db.coupon.create({
      data: { name: 'IT Pro gift', type: 'FIXED', value: 10000, proOnly: true },
    });
    const first = await grantVoucherToAllPro(coupon.id);
    if (!first.ok) throw new Error(first.error);
    const mine = first.data.filter((grant) => grant.email === PRO.email);
    expect(mine).toHaveLength(1);
    expect(first.data.some((grant) => grant.email === BASIC.email)).toBe(false);

    const again = await grantVoucherToAllPro(coupon.id);
    if (!again.ok) throw new Error(again.error);
    expect(again.data.some((grant) => grant.email === PRO.email)).toBe(false);

    // Mã quà chỉ Pro: người nhận dùng được.
    expect((await findCouponByCode(mine[0]!.code, { userId: PRO.id })).ok).toBe(true);
  });
});
