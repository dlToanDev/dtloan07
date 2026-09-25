import type { Prisma } from '@prisma/client';

export interface ReserveLine {
  variantId: string;
  qty: number;
  /** Tên hiển thị dùng trong thông báo lỗi, ví dụ "Áo thun – Đen / M". */
  label: string;
}

export type ReserveResult = { ok: true; reservedCount: number } | { ok: false; error: string };

/**
 * Giữ chỗ tồn kho bằng UPDATE có điều kiện, phải gọi bên trong `db.$transaction`.
 *
 * `stock = null` nghĩa là không giới hạn nên bỏ qua. Điều kiện `stock >= qty`
 * nằm ngay trong câu UPDATE để hai người mua cùng lúc không thể bán vượt kho:
 * người thứ hai nhận 0 dòng bị ảnh hưởng và cả transaction bị rollback.
 */
export async function reserveVariantStock(
  tx: Prisma.TransactionClient,
  lines: ReserveLine[],
): Promise<ReserveResult> {
  let reservedCount = 0;

  for (const line of lines) {
    const affected = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "stock" = "stock" - ${line.qty}
      WHERE "id" = ${line.variantId} AND "stock" IS NOT NULL AND "stock" >= ${line.qty}
    `;

    if (affected > 0) {
      reservedCount += 1;
      continue;
    }

    // Không trừ được: hoặc biến thể không giới hạn kho, hoặc không đủ hàng.
    const variant = await tx.productVariant.findUnique({
      where: { id: line.variantId },
      select: { stock: true },
    });

    if (!variant) return { ok: false, error: `"${line.label}" không còn được bán.` };
    if (variant.stock !== null) {
      return { ok: false, error: `"${line.label}" chỉ còn ${variant.stock}.` };
    }
  }

  return { ok: true, reservedCount };
}

/**
 * Cộng lại tồn kho của một đơn (hết hạn hoặc bị hủy). Dùng chung cho cron và admin.
 * Chỉ gọi khi đơn chuyển khỏi trạng thái đang giữ hàng, và gọi đúng một lần.
 */
export async function releaseOrderInventory(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, qty: true },
  });

  for (const item of items) {
    if (!item.variantId) continue;
    await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "stock" = "stock" + ${item.qty}
      WHERE "id" = ${item.variantId} AND "stock" IS NOT NULL
    `;
  }

  return items.length;
}
