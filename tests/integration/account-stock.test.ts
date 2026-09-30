/**
 * Test tích hợp kho tài khoản số trên PostgreSQL thật.
 * Chạy bằng `pnpm test:int` sau khi đã dựng database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

process.env.ACCOUNT_ENCRYPTION_KEY =
  process.env.ACCOUNT_ENCRYPTION_KEY || Buffer.alloc(32, 3).toString('base64');

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'x', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const sentEmails: Array<{ to: string; accounts: Array<{ label: string; credentials: string }> }> =
  [];
vi.mock('@/lib/mail', () => ({
  sendAccountDeliveryEmail: async (payload: {
    to: string;
    accounts: Array<{ label: string; credentials: string }>;
  }) => {
    sentEmails.push(payload);
    return { success: true };
  },
}));

const { db } = await import('@/lib/db');
const { encryptCredentials, decryptCredentials } = await import('@/lib/crypto/credentials');
const { countAvailableAccounts, releaseAccountsForOrder, reserveAccountsForItem } =
  await import('@/lib/shop/account-stock');
const { deliverAutoAccounts } = await import('@/lib/shop/account-delivery');
const { deliverManualAccount } = await import('@/server/actions/account-stock');

const PRODUCT_ID = 'it-account-product';
const VARIANT_ID = 'it-account-variant';

async function seedStock(count: number) {
  await db.accountStock.deleteMany({ where: { variantId: VARIANT_ID } });
  await db.accountStock.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      variantId: VARIANT_ID,
      credentials: encryptCredentials(`user${index}@netflix.test|matkhau${index}`),
    })),
  });
}

async function makeOrderWithItem(qty: number) {
  const order = await db.order.create({
    data: {
      orderCode: `ITA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: 'khach@example.com',
      customerName: 'Khách Test',
      phone: '0912345678',
      status: 'PENDING',
      subtotalVnd: 100000,
      discountVnd: 0,
      totalVnd: 100000,
      provider: 'PAYOS',
      paymentMethod: 'PAYOS',
      fulfillmentStatus: 'PENDING',
      items: {
        create: {
          productId: PRODUCT_ID,
          variantId: VARIANT_ID,
          variantNameSnapshot: '3 tháng',
          productTypeSnapshot: 'ACCOUNT',
          qty,
          unitPriceVnd: 100000,
          productNameSnapshot: 'Netflix test',
        },
      },
    },
    include: { items: true },
  });
  return { order, item: order.items[0]! };
}

const cleanupOrders = async () => {
  const orders = await db.order.findMany({
    where: { orderCode: { startsWith: 'ITA-' } },
    select: { id: true },
  });
  const ids = orders.map((order) => order.id);
  if (ids.length === 0) return;
  const items = await db.orderItem.findMany({
    where: { orderId: { in: ids } },
    select: { id: true },
  });
  await db.accountStock.updateMany({
    where: { orderItemId: { in: items.map((item) => item.id) } },
    data: { orderItemId: null },
  });
  await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await db.order.deleteMany({ where: { id: { in: ids } } });
};

beforeAll(async () => {
  await db.product.upsert({
    where: { id: PRODUCT_ID },
    update: { type: 'ACCOUNT', deliveryMode: 'AUTO' },
    create: {
      id: PRODUCT_ID,
      slug: 'it-account-fixture',
      name: 'Netflix test',
      shortDesc: 'Fixture tài khoản',
      description: 'Fixture',
      saleMode: 'PAID',
      priceVnd: 100000,
      coverUrl: '',
      status: 'ACTIVE',
      version: '1.0.0',
      type: 'ACCOUNT',
      deliveryMode: 'AUTO',
    },
  });
  await db.productVariant.upsert({
    where: { id: VARIANT_ID },
    update: { stock: null, active: true },
    create: {
      id: VARIANT_ID,
      productId: PRODUCT_ID,
      name: '3 tháng',
      priceVnd: 100000,
      stock: null,
    },
  });
});

beforeEach(() => {
  sentEmails.length = 0;
});

afterAll(async () => {
  await cleanupOrders();
  await db.accountStock.deleteMany({ where: { variantId: VARIANT_ID } });
  await db.productVariant.deleteMany({ where: { productId: PRODUCT_ID } });
  await db.product.deleteMany({ where: { id: PRODUCT_ID } });
  await db.credentialAccessLog.deleteMany({ where: { actorEmail: 'khach@example.com' } });
});

describe('kho tài khoản', () => {
  it('đếm đúng số tài khoản còn trống', async () => {
    await seedStock(3);
    const counts = await countAvailableAccounts([VARIANT_ID]);
    expect(counts.get(VARIANT_ID)).toBe(3);
  });

  it('không lưu chữ thường trong database', async () => {
    await seedStock(1);
    const row = await db.accountStock.findFirstOrThrow({ where: { variantId: VARIANT_ID } });
    expect(row.credentials).not.toContain('@netflix.test');
    expect(row.credentials).not.toContain('matkhau');
  });

  it('giữ chỗ đúng số lượng và từ chối khi kho không đủ', async () => {
    await seedStock(2);
    const { item } = await makeOrderWithItem(3);

    const notEnough = await db.$transaction((tx) =>
      reserveAccountsForItem(tx, {
        variantId: VARIANT_ID,
        orderItemId: item.id,
        qty: 3,
        reservedUntil: null,
        label: 'Netflix test – 3 tháng',
      }),
    );
    expect(notEnough.ok).toBe(false);
    if (!notEnough.ok) expect(notEnough.error).toContain('chỉ còn 2');

    const ok = await db.$transaction((tx) =>
      reserveAccountsForItem(tx, {
        variantId: VARIANT_ID,
        orderItemId: item.id,
        qty: 2,
        reservedUntil: null,
        label: 'Netflix test – 3 tháng',
      }),
    );
    expect(ok.ok).toBe(true);
    expect((await countAvailableAccounts([VARIANT_ID])).get(VARIANT_ID) ?? 0).toBe(0);

    await cleanupOrders();
  });

  it('hai đơn mua cùng lúc không nhận trùng tài khoản', async () => {
    await seedStock(2);
    const first = await makeOrderWithItem(1);
    const second = await makeOrderWithItem(1);

    const [a, b] = await Promise.all([
      db.$transaction((tx) =>
        reserveAccountsForItem(tx, {
          variantId: VARIANT_ID,
          orderItemId: first.item.id,
          qty: 1,
          reservedUntil: null,
          label: 'Netflix test',
        }),
      ),
      db.$transaction((tx) =>
        reserveAccountsForItem(tx, {
          variantId: VARIANT_ID,
          orderItemId: second.item.id,
          qty: 1,
          reservedUntil: null,
          label: 'Netflix test',
        }),
      ),
    ]);

    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.ids[0]).not.toBe(b.ids[0]);
    }
    expect((await countAvailableAccounts([VARIANT_ID])).get(VARIANT_ID) ?? 0).toBe(0);

    await cleanupOrders();
  });

  it('đơn hết hạn trả tài khoản về kho', async () => {
    await seedStock(1);
    const { order, item } = await makeOrderWithItem(1);
    await db.$transaction((tx) =>
      reserveAccountsForItem(tx, {
        variantId: VARIANT_ID,
        orderItemId: item.id,
        qty: 1,
        reservedUntil: new Date(),
        label: 'Netflix test',
      }),
    );
    expect((await countAvailableAccounts([VARIANT_ID])).get(VARIANT_ID) ?? 0).toBe(0);

    await db.$transaction((tx) => releaseAccountsForOrder(tx, order.id));
    expect((await countAvailableAccounts([VARIANT_ID])).get(VARIANT_ID) ?? 0).toBe(1);

    await cleanupOrders();
  });
});

describe('bàn giao thủ công', () => {
  it('mã hóa thông tin vào OrderItem, gửi email và hoàn tất đơn', async () => {
    const { order, item } = await makeOrderWithItem(1);
    await db.order.update({ where: { id: order.id }, data: { status: 'PAID' } });

    const form = new FormData();
    form.append('orderItemId', item.id);
    form.append('credentials', 'codex@demo.vn|MatKhauCodex#1');
    const result = await deliverManualAccount({}, form);
    expect(result.success).toBeTruthy();

    const updated = await db.orderItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.deliveredAt).not.toBeNull();
    expect(updated.deliveredCredentials).not.toBeNull();
    // Không lưu chữ thường
    expect(updated.deliveredCredentials).not.toContain('MatKhauCodex');
    expect(decryptCredentials(updated.deliveredCredentials!)).toBe('codex@demo.vn|MatKhauCodex#1');

    expect(sentEmails.at(-1)?.accounts[0]?.credentials).toBe('codex@demo.vn|MatKhauCodex#1');

    const finished = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finished.fulfillmentStatus).toBe('DELIVERED');

    await cleanupOrders();
  });
});

describe('bàn giao tự động', () => {
  it('chuyển kho sang DELIVERED, gửi email đúng nội dung và ghi log EMAIL', async () => {
    await seedStock(1);
    const { order, item } = await makeOrderWithItem(1);
    await db.$transaction((tx) =>
      reserveAccountsForItem(tx, {
        variantId: VARIANT_ID,
        orderItemId: item.id,
        qty: 1,
        reservedUntil: null,
        label: 'Netflix test',
      }),
    );

    const count = await deliverAutoAccounts({
      id: order.id,
      orderCode: order.orderCode,
      email: order.email,
      userId: null,
    });

    expect(count).toBe(1);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.accounts[0]?.credentials).toContain('@netflix.test');
    expect(sentEmails[0]?.accounts[0]?.label).toContain('3 tháng');

    const row = await db.accountStock.findFirstOrThrow({ where: { orderItemId: item.id } });
    expect(row.status).toBe('DELIVERED');
    expect(row.deliveredAt).not.toBeNull();

    const logs = await db.credentialAccessLog.count({
      where: { orderItemId: item.id, reason: 'EMAIL' },
    });
    expect(logs).toBe(1);

    await cleanupOrders();
  });
});
