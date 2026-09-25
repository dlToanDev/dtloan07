/**
 * Test tích hợp chạy trên PostgreSQL thật (spec mục 9).
 * Chạy riêng bằng `pnpm test:int` sau khi đã `docker compose up -d postgres`
 * và `pnpm prisma migrate deploy` — `pnpm test` không chạy file này.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'x', role: 'ADMIN' } }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/mail', () => ({ sendOrderStatusEmail: async () => ({ success: true }) }));

const { db } = await import('@/lib/db');
const { advanceFulfillment, cancelOrder } = await import('@/server/actions/order');
const { reserveVariantStock, releaseOrderInventory } = await import('@/lib/shop/inventory');

const PRODUCT_ID = 'it-product';
const VARIANT_ID = 'it-variant';
const START_STOCK = 10;

const fd = (data: Record<string, string>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) form.append(key, value);
  return form;
};

async function makeOrder(paymentMethod: 'COD' | 'PAYOS') {
  return db.order.create({
    data: {
      orderCode: `IT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: 'test@example.com',
      customerName: 'Khách Test',
      phone: '0912345678',
      status: 'PENDING',
      subtotalVnd: 150000,
      discountVnd: 0,
      shippingFeeVnd: 20000,
      totalVnd: 170000,
      provider: 'PAYOS',
      paymentMethod,
      fulfillmentStatus: 'PENDING',
      shipProvince: 'ha-noi',
      shipAddress: '12 Trần Duy Hưng',
      items: {
        create: {
          productId: PRODUCT_ID,
          variantId: VARIANT_ID,
          variantNameSnapshot: 'Đen / M',
          productTypeSnapshot: 'PHYSICAL',
          qty: 1,
          unitPriceVnd: 150000,
          productNameSnapshot: 'Áo test',
        },
      },
    },
  });
}

const stock = async () =>
  (await db.productVariant.findUnique({ where: { id: VARIANT_ID }, select: { stock: true } }))
    ?.stock ?? null;

const cleanupOrder = async (orderId: string) => {
  await db.orderItem.deleteMany({ where: { orderId } });
  await db.order.delete({ where: { id: orderId } }).catch(() => {});
};

beforeAll(async () => {
  await db.product.upsert({
    where: { id: PRODUCT_ID },
    update: {},
    create: {
      id: PRODUCT_ID,
      slug: 'it-product-fixture',
      name: 'Áo test',
      shortDesc: 'Fixture cho test tích hợp',
      description: 'Fixture',
      saleMode: 'PAID',
      priceVnd: 150000,
      coverUrl: '',
      status: 'ACTIVE',
      kind: 'SHOP',
      version: '1.0.0',
      type: 'PHYSICAL',
      category: 'APPAREL',
    },
  });
  await db.productVariant.upsert({
    where: { id: VARIANT_ID },
    update: { stock: START_STOCK, active: true },
    create: {
      id: VARIANT_ID,
      productId: PRODUCT_ID,
      name: 'Đen / M',
      priceVnd: 150000,
      stock: START_STOCK,
    },
  });
});

afterAll(async () => {
  await db.orderItem.deleteMany({ where: { productId: PRODUCT_ID } });
  await db.order.deleteMany({ where: { orderCode: { startsWith: 'IT-' } } });
  await db.productVariant.deleteMany({ where: { productId: PRODUCT_ID } });
  await db.product.deleteMany({ where: { id: PRODUCT_ID } });
});

describe('giữ chỗ tồn kho', () => {
  it('không bán vượt kho: hai lần giữ chỗ liên tiếp quá tồn thì lần sau bị từ chối', async () => {
    await db.productVariant.update({ where: { id: VARIANT_ID }, data: { stock: 1 } });

    const first = await db.$transaction((tx) =>
      reserveVariantStock(tx, [{ variantId: VARIANT_ID, qty: 1, label: 'Áo test – Đen / M' }]),
    );
    expect(first.ok).toBe(true);
    expect(await stock()).toBe(0);

    const second = await db.$transaction((tx) =>
      reserveVariantStock(tx, [{ variantId: VARIANT_ID, qty: 1, label: 'Áo test – Đen / M' }]),
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toContain('chỉ còn 0');

    await db.productVariant.update({ where: { id: VARIANT_ID }, data: { stock: START_STOCK } });
  });

  it('biến thể không giới hạn kho (stock = null) luôn giữ chỗ được', async () => {
    await db.productVariant.update({ where: { id: VARIANT_ID }, data: { stock: null } });
    const result = await db.$transaction((tx) =>
      reserveVariantStock(tx, [{ variantId: VARIANT_ID, qty: 999, label: 'Áo test' }]),
    );
    expect(result).toEqual({ ok: true, reservedCount: 0 });
    await db.productVariant.update({ where: { id: VARIANT_ID }, data: { stock: START_STOCK } });
  });

  it('releaseOrderInventory cộng lại đúng số lượng của đơn', async () => {
    const order = await makeOrder('PAYOS');
    await db.productVariant.update({ where: { id: VARIANT_ID }, data: { stock: START_STOCK - 1 } });
    await db.$transaction((tx) => releaseOrderInventory(tx, order.id));
    expect(await stock()).toBe(START_STOCK);
    await cleanupOrder(order.id);
  });
});

describe('vòng đời giao hàng', () => {
  it('COD: PENDING → CONFIRMED → SHIPPING → DELIVERED và tự đánh dấu đã thanh toán', async () => {
    const order = await makeOrder('COD');

    expect(
      (await advanceFulfillment({}, fd({ orderId: order.id, action: 'CONFIRM' }))).success,
    ).toBeTruthy();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).fulfillmentStatus).toBe(
      'CONFIRMED',
    );

    await advanceFulfillment({}, fd({ orderId: order.id, action: 'SHIP', trackingCode: 'GHN999' }));
    const shipping = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(shipping.fulfillmentStatus).toBe('SHIPPING');
    expect(shipping.trackingCode).toBe('GHN999');

    await advanceFulfillment({}, fd({ orderId: order.id, action: 'DELIVER' }));
    const delivered = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(delivered.fulfillmentStatus).toBe('DELIVERED');
    expect(delivered.status).toBe('PAID');
    expect(delivered.paidAt).not.toBeNull();

    await cleanupOrder(order.id);
  });

  it('từ chối bước nhảy cóc (PENDING không thể sang SHIPPING)', async () => {
    const order = await makeOrder('COD');
    const result = await advanceFulfillment({}, fd({ orderId: order.id, action: 'SHIP' }));
    expect(result.error).toBeTruthy();
    await cleanupOrder(order.id);
  });

  it('hủy đơn chưa thanh toán: trả lại tồn kho và đặt FAILED', async () => {
    const order = await makeOrder('PAYOS');
    await db.productVariant.update({ where: { id: VARIANT_ID }, data: { stock: START_STOCK - 1 } });

    const result = await cancelOrder({}, fd({ orderId: order.id }));
    expect(result.success).toBeTruthy();
    expect(await stock()).toBe(START_STOCK);

    const cancelled = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(cancelled.fulfillmentStatus).toBe('CANCELLED');
    expect(cancelled.status).toBe('FAILED');
    expect(cancelled.cancelledAt).not.toBeNull();

    await cleanupOrder(order.id);
  });

  it('hủy đơn đã thanh toán: giữ PAID và cảnh báo hoàn tiền thủ công', async () => {
    const order = await makeOrder('PAYOS');
    await db.order.update({ where: { id: order.id }, data: { status: 'PAID' } });

    const result = await cancelOrder({}, fd({ orderId: order.id }));
    expect(result.success).toContain('hoàn tiền thủ công');
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');

    await cleanupOrder(order.id);
  });
});
