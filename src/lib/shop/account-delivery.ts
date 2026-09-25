import { db } from '@/lib/db';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { deliverAccountsForOrder, logCredentialAccess } from '@/lib/shop/account-stock';
import { sendAccountDeliveryEmail } from '@/lib/mail';

/**
 * Chốt bàn giao tài khoản tự động của một đơn đã thanh toán:
 * chuyển kho sang DELIVERED, giải mã, ghi log `EMAIL` rồi gửi cho khách.
 *
 * Gọi được nhiều lần một cách an toàn: lần sau không còn dòng RESERVED nào
 * nên chỉ gửi lại đúng các tài khoản đã thuộc về đơn.
 */
export async function deliverAutoAccounts(order: {
  id: string;
  orderCode: string;
  email: string;
  userId?: string | null;
}): Promise<number> {
  const delivered = await db.$transaction((tx) => deliverAccountsForOrder(tx, order.id));
  if (delivered.length === 0) return 0;

  const accounts = delivered.map((row) => ({
    label: row.label,
    credentials: decryptCredentials(row.credentials),
  }));

  for (const row of delivered) {
    await logCredentialAccess(db, {
      actorUserId: order.userId ?? null,
      actorEmail: order.email,
      accountStockId: row.id,
      orderItemId: row.orderItemId,
      reason: 'EMAIL',
    });
  }

  await sendAccountDeliveryEmail({
    to: order.email,
    orderCode: order.orderCode,
    accounts,
  });

  return delivered.length;
}
