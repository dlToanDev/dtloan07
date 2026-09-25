'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { requireProductAdmin } from '@/server/actions/product';
import {
  decryptCredentials,
  encryptCredentials,
  isCredentialKeyConfigured,
  splitCredentialLines,
} from '@/lib/crypto/credentials';
import { logCredentialAccess } from '@/lib/shop/account-stock';
import { sendAccountDeliveryEmail } from '@/lib/mail';

export type AccountStockState = { error?: string; success?: string; revealed?: string };

const MAX_BULK_LINES = 500;

async function adminEmail() {
  const session = await auth();
  return {
    email: session?.user?.email ?? 'admin',
    userId: session?.user?.id ?? null,
  };
}

/** Nhập hàng loạt: mỗi dòng một tài khoản, lưu ở dạng đã mã hóa. */
export async function importAccountStock(
  _state: AccountStockState,
  form: FormData,
): Promise<AccountStockState> {
  await requireProductAdmin();

  const variantId = String(form.get('variantId') || '');
  const bulk = String(form.get('bulk') || '');
  if (!variantId) return { error: 'Vui lòng chọn biến thể.' };
  if (!isCredentialKeyConfigured())
    return { error: 'Chưa cấu hình ACCOUNT_ENCRYPTION_KEY trong .env nên không thể nhập kho.' };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true },
  });
  if (!variant) return { error: 'Không tìm thấy biến thể.' };

  const lines = splitCredentialLines(bulk);
  if (lines.length === 0) return { error: 'Chưa có dòng tài khoản nào để nhập.' };
  if (lines.length > MAX_BULK_LINES)
    return { error: `Mỗi lần nhập tối đa ${MAX_BULK_LINES} dòng.` };

  try {
    await db.accountStock.createMany({
      data: lines.map((line) => ({ variantId, credentials: encryptCredentials(line) })),
    });
  } catch (error) {
    console.error('Nhập kho tài khoản thất bại:', error);
    return { error: 'Không thể nhập kho. Vui lòng thử lại.' };
  }

  revalidatePath(`/admin/shop/${variant.productId}/edit`);
  return { success: `Đã thêm ${lines.length} tài khoản vào kho.` };
}

/** Giải mã một dòng kho để admin xem. Mỗi lần xem đều ghi log ADMIN_VIEW. */
export async function revealAccountStock(
  _state: AccountStockState,
  form: FormData,
): Promise<AccountStockState> {
  await requireProductAdmin();

  const id = String(form.get('id') || '');
  const row = await db.accountStock.findUnique({ where: { id } });
  if (!row) return { error: 'Không tìm thấy dòng kho.' };

  try {
    const plain = decryptCredentials(row.credentials);
    const actor = await adminEmail();
    await logCredentialAccess(db, {
      actorUserId: actor.userId,
      actorEmail: actor.email,
      accountStockId: row.id,
      orderItemId: row.orderItemId,
      reason: 'ADMIN_VIEW',
    });
    return { revealed: plain };
  } catch (error) {
    console.error('Giải mã tài khoản thất bại:', error);
    return { error: 'Không giải mã được. Kiểm tra ACCOUNT_ENCRYPTION_KEY có đúng khóa đã dùng.' };
  }
}

/** Xóa một dòng kho còn trống (chưa bán cho ai). */
export async function deleteAccountStock(
  _state: AccountStockState,
  form: FormData,
): Promise<AccountStockState> {
  await requireProductAdmin();

  const id = String(form.get('id') || '');
  const row = await db.accountStock.findUnique({
    where: { id },
    select: { id: true, status: true, variant: { select: { productId: true } } },
  });
  if (!row) return { error: 'Không tìm thấy dòng kho.' };
  if (row.status !== 'AVAILABLE')
    return { error: 'Chỉ xóa được tài khoản còn trống, chưa gán cho đơn nào.' };

  await db.accountStock.delete({ where: { id } });
  revalidatePath(`/admin/shop/${row.variant.productId}/edit`);
  return { success: 'Đã xóa tài khoản khỏi kho.' };
}

/**
 * Bảo hành: thu hồi tài khoản đã giao và cấp tài khoản mới cùng biến thể,
 * rồi gửi lại cho khách.
 */
export async function replaceAccountStock(
  _state: AccountStockState,
  form: FormData,
): Promise<AccountStockState> {
  await requireProductAdmin();

  const id = String(form.get('id') || '');
  const old = await db.accountStock.findUnique({
    where: { id },
    include: {
      variant: { select: { productId: true } },
      orderItem: {
        select: {
          id: true,
          productNameSnapshot: true,
          variantNameSnapshot: true,
          order: { select: { id: true, orderCode: true, email: true, userId: true } },
        },
      },
    },
  });

  if (!old) return { error: 'Không tìm thấy dòng kho.' };
  if (old.status !== 'DELIVERED') return { error: 'Chỉ đổi được tài khoản đã bàn giao.' };
  if (!old.orderItem) return { error: 'Dòng kho này không gắn với đơn hàng nào.' };

  const replacement = await db.accountStock.findFirst({
    where: { variantId: old.variantId, status: 'AVAILABLE' },
    orderBy: { createdAt: 'asc' },
  });
  if (!replacement) return { error: 'Kho không còn tài khoản trống cùng biến thể để đổi.' };

  const orderItem = old.orderItem;
  let plain: string;
  try {
    plain = decryptCredentials(replacement.credentials);
  } catch {
    return { error: 'Không giải mã được tài khoản thay thế.' };
  }

  await db.$transaction([
    db.accountStock.update({ where: { id: old.id }, data: { status: 'REVOKED' } }),
    db.accountStock.update({
      where: { id: replacement.id },
      data: { status: 'DELIVERED', orderItemId: orderItem.id, deliveredAt: new Date() },
    }),
  ]);

  const actor = await adminEmail();
  await logCredentialAccess(db, {
    actorUserId: actor.userId,
    actorEmail: actor.email,
    accountStockId: replacement.id,
    orderItemId: orderItem.id,
    reason: 'ADMIN_VIEW',
  });

  await sendAccountDeliveryEmail({
    to: orderItem.order.email,
    orderCode: orderItem.order.orderCode,
    accounts: [
      {
        label: orderItem.variantNameSnapshot
          ? `${orderItem.productNameSnapshot} — ${orderItem.variantNameSnapshot} (đổi bảo hành)`
          : `${orderItem.productNameSnapshot} (đổi bảo hành)`,
        credentials: plain,
      },
    ],
  }).catch((e) => console.error('Lỗi gửi mail đổi tài khoản:', e));

  revalidatePath(`/admin/shop/${old.variant.productId}/edit`);
  return { success: 'Đã đổi tài khoản mới và gửi lại cho khách.' };
}

/** Bàn giao thủ công cho một OrderItem tài khoản (spec 6.4). */
export async function deliverManualAccount(
  _state: AccountStockState,
  form: FormData,
): Promise<AccountStockState> {
  await requireProductAdmin();

  const orderItemId = String(form.get('orderItemId') || '');
  const credentials = String(form.get('credentials') || '').trim();
  if (!credentials) return { error: 'Vui lòng nhập thông tin tài khoản để bàn giao.' };
  if (!isCredentialKeyConfigured())
    return { error: 'Chưa cấu hình ACCOUNT_ENCRYPTION_KEY trong .env nên không thể bàn giao.' };

  const item = await db.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      productNameSnapshot: true,
      variantNameSnapshot: true,
      productTypeSnapshot: true,
      orderId: true,
      order: { select: { orderCode: true, email: true, userId: true } },
    },
  });
  if (!item) return { error: 'Không tìm thấy dòng đơn hàng.' };
  if (item.productTypeSnapshot !== 'ACCOUNT') return { error: 'Dòng này không phải tài khoản số.' };

  await db.orderItem.update({
    where: { id: item.id },
    data: { deliveredCredentials: encryptCredentials(credentials), deliveredAt: new Date() },
  });

  await logCredentialAccess(db, {
    actorUserId: item.order.userId,
    actorEmail: item.order.email,
    orderItemId: item.id,
    reason: 'EMAIL',
  });

  await sendAccountDeliveryEmail({
    to: item.order.email,
    orderCode: item.order.orderCode,
    accounts: [
      {
        label: item.variantNameSnapshot
          ? `${item.productNameSnapshot} — ${item.variantNameSnapshot}`
          : item.productNameSnapshot,
        credentials,
      },
    ],
  }).catch((e) => console.error('Lỗi gửi mail bàn giao tài khoản:', e));

  // Mọi dòng tài khoản đã bàn giao và không còn hàng vật lý → đơn hoàn tất.
  const pending = await db.orderItem.count({
    where: { orderId: item.orderId, productTypeSnapshot: 'ACCOUNT', deliveredAt: null },
  });
  const physical = await db.orderItem.count({
    where: { orderId: item.orderId, productTypeSnapshot: 'PHYSICAL' },
  });
  if (pending === 0 && physical === 0) {
    await db.order.update({
      where: { id: item.orderId },
      data: { fulfillmentStatus: 'DELIVERED' },
    });
  }

  revalidatePath(`/admin/orders/${item.orderId}`);
  return { success: 'Đã bàn giao và gửi email cho khách.' };
}
