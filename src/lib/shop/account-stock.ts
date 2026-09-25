import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/** Số lượng tối đa mỗi dòng giỏ hàng với tài khoản số (spec 5.2). */
export const MAX_ACCOUNT_QTY_PER_LINE = 5;

/** Đếm số tài khoản còn trống theo biến thể. Trả map variantId → số lượng. */
export async function countAvailableAccounts(variantIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (variantIds.length === 0) return counts;

  const rows = await db.accountStock.groupBy({
    by: ['variantId'],
    where: { variantId: { in: [...new Set(variantIds)] }, status: 'AVAILABLE' },
    _count: { _all: true },
  });

  for (const row of rows) counts.set(row.variantId, row._count._all);
  return counts;
}

/**
 * Giữ chỗ `qty` tài khoản cho một OrderItem, phải gọi trong `db.$transaction`.
 *
 * `FOR UPDATE SKIP LOCKED` cho phép hai giao dịch song song mỗi bên lấy một
 * nhóm dòng khác nhau thay vì chờ nhau, nên hai khách mua cùng lúc không bao
 * giờ nhận trùng một tài khoản.
 */
export async function reserveAccountsForItem(
  tx: Prisma.TransactionClient,
  {
    variantId,
    orderItemId,
    qty,
    reservedUntil,
    label,
  }: {
    variantId: string;
    orderItemId: string;
    qty: number;
    reservedUntil: Date | null;
    label: string;
  },
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const picked = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "AccountStock"
    WHERE "variantId" = ${variantId} AND "status" = 'AVAILABLE'
    ORDER BY "createdAt" ASC
    LIMIT ${qty}
    FOR UPDATE SKIP LOCKED
  `;

  if (picked.length < qty) {
    return { ok: false, error: `"${label}" chỉ còn ${picked.length} tài khoản trong kho.` };
  }

  const ids = picked.map((row) => row.id);
  await tx.accountStock.updateMany({
    where: { id: { in: ids } },
    data: { status: 'RESERVED', orderItemId, reservedUntil },
  });

  return { ok: true, ids };
}

/** Trả tài khoản đang giữ chỗ của một đơn về kho (đơn hết hạn hoặc bị hủy). */
export async function releaseAccountsForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { id: true } });
  if (items.length === 0) return 0;

  const result = await tx.accountStock.updateMany({
    where: { orderItemId: { in: items.map((item) => item.id) }, status: 'RESERVED' },
    data: { status: 'AVAILABLE', orderItemId: null, reservedUntil: null },
  });

  return result.count;
}

/**
 * Chốt bàn giao: chuyển tài khoản đang giữ chỗ của đơn sang DELIVERED.
 * Trả về thông tin (vẫn ở dạng mã hóa) để lớp gọi tự giải mã và ghi log.
 */
export async function deliverAccountsForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId, productTypeSnapshot: 'ACCOUNT' },
    select: { id: true, productNameSnapshot: true, variantNameSnapshot: true },
  });
  if (items.length === 0) return [];

  const itemIds = items.map((item) => item.id);
  const now = new Date();

  await tx.accountStock.updateMany({
    where: { orderItemId: { in: itemIds }, status: 'RESERVED' },
    data: { status: 'DELIVERED', deliveredAt: now, reservedUntil: null },
  });

  const delivered = await tx.accountStock.findMany({
    where: { orderItemId: { in: itemIds }, status: 'DELIVERED' },
    select: { id: true, orderItemId: true, credentials: true },
  });

  const labelByItem = new Map(
    items.map((item) => [
      item.id,
      item.variantNameSnapshot
        ? `${item.productNameSnapshot} — ${item.variantNameSnapshot}`
        : item.productNameSnapshot,
    ]),
  );

  return delivered.map((row) => ({
    id: row.id,
    orderItemId: row.orderItemId,
    label: labelByItem.get(row.orderItemId ?? '') ?? 'Tài khoản',
    credentials: row.credentials,
  }));
}

/** Ghi nhật ký mỗi lần giải mã thông tin tài khoản (spec 3.8). */
export async function logCredentialAccess(
  client: Prisma.TransactionClient | typeof db,
  entry: {
    actorUserId?: string | null;
    actorEmail: string;
    accountStockId?: string | null;
    orderItemId?: string | null;
    reason: 'ADMIN_VIEW' | 'CUSTOMER_VIEW' | 'EMAIL';
  },
) {
  await client.credentialAccessLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      actorEmail: entry.actorEmail,
      accountStockId: entry.accountStockId ?? null,
      orderItemId: entry.orderItemId ?? null,
      reason: entry.reason,
    },
  });
}
