'use server';

import type { FulfillmentStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireProductAdmin } from '@/server/actions/product';
import { releaseOrderInventory } from '@/lib/shop/inventory';
import { releaseAccountsForOrder } from '@/lib/shop/account-stock';
import { sendOrderStatusEmail } from '@/lib/mail';

export type OrderActionState = { error?: string; success?: string };

/** Chuyển tiếp hợp lệ của vòng đời giao hàng. */
const NEXT_STATUS: Record<
  string,
  { from: FulfillmentStatus[]; to: FulfillmentStatus } | undefined
> = {
  CONFIRM: { from: ['PENDING'], to: 'CONFIRMED' },
  SHIP: { from: ['CONFIRMED'], to: 'SHIPPING' },
  DELIVER: { from: ['SHIPPING'], to: 'DELIVERED' },
};

/**
 * Đổi trạng thái giao hàng. Đơn COD khi "Đã giao" thì đồng thời được ghi nhận
 * đã thanh toán, vì tiền được thu ngay lúc giao.
 */
export async function advanceFulfillment(
  _state: OrderActionState,
  form: FormData,
): Promise<OrderActionState> {
  await requireProductAdmin();

  const orderId = String(form.get('orderId') || '');
  const action = String(form.get('action') || '');
  const trackingCode = String(form.get('trackingCode') || '').trim();

  const transition = NEXT_STATUS[action];
  if (!orderId || !transition) return { error: 'Thao tác không hợp lệ.' };

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: 'Không tìm thấy đơn hàng.' };
  if (!order.fulfillmentStatus || !transition.from.includes(order.fulfillmentStatus)) {
    return { error: `Đơn đang ở trạng thái ${order.fulfillmentStatus ?? 'không giao hàng'}.` };
  }

  const markPaid = transition.to === 'DELIVERED' && order.paymentMethod === 'COD';

  await db.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: transition.to,
      ...(trackingCode && { trackingCode }),
      ...(markPaid && order.status !== 'PAID' && { status: 'PAID', paidAt: new Date() }),
    },
  });

  await sendOrderStatusEmail({
    to: order.email,
    orderCode: order.orderCode,
    status: transition.to,
    trackingCode: trackingCode || order.trackingCode,
  }).catch((e) => console.error('Lỗi gửi mail trạng thái đơn:', e));

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { success: 'Đã cập nhật trạng thái đơn hàng.' };
}

/**
 * Hủy đơn: trả lại tồn kho đã giữ chỗ, đánh dấu đơn hủy.
 * Đơn PayOS chưa trả tiền chuyển sang FAILED; đơn đã trả tiền giữ nguyên
 * trạng thái thanh toán và cần hoàn tiền thủ công.
 */
export async function cancelOrder(
  _state: OrderActionState,
  form: FormData,
): Promise<OrderActionState> {
  await requireProductAdmin();

  const orderId = String(form.get('orderId') || '');
  if (!orderId) return { error: 'Thiếu mã đơn hàng.' };

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: 'Không tìm thấy đơn hàng.' };
  if (order.fulfillmentStatus === 'CANCELLED') return { error: 'Đơn đã được hủy trước đó.' };
  if (order.fulfillmentStatus === 'DELIVERED') return { error: 'Đơn đã giao, không thể hủy.' };

  const wasPaid = order.status === 'PAID';

  await db.$transaction(async (tx) => {
    // Chỉ trả kho khi đơn vẫn đang giữ hàng (chưa hủy, chưa hết hạn).
    if (order.status === 'PENDING' || order.status === 'PAID') {
      await releaseOrderInventory(tx, orderId);
      await releaseAccountsForOrder(tx, orderId);
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: 'CANCELLED',
        cancelledAt: new Date(),
        ...(wasPaid ? {} : { status: 'FAILED' }),
      },
    });
  });

  await sendOrderStatusEmail({
    to: order.email,
    orderCode: order.orderCode,
    status: 'CANCELLED',
  }).catch((e) => console.error('Lỗi gửi mail hủy đơn:', e));

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return {
    success: wasPaid
      ? 'Đã hủy đơn và trả lại tồn kho. Đơn đã thanh toán — cần hoàn tiền thủ công cho khách.'
      : 'Đã hủy đơn và trả lại tồn kho.',
  };
}
