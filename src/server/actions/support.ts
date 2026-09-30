'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/mail';
import { siteConfig } from '@/config/site';
import { SupportTicketStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Bạn không có quyền thực hiện thao tác quản trị này.');
  }
  return session;
}

export interface CreateSupportTicketInput {
  name?: string;
  contact?: string;
  subject: string;
  message: string;
  imageUrl?: string;
}

/**
 * Khách hàng tạo mới 1 đơn yêu cầu hỗ trợ (gửi đơn chờ admin duyệt)
 */
export async function createSupportTicket(data: CreateSupportTicketInput) {
  const message = data.message?.trim();
  const subject = data.subject?.trim() || 'Cần hỗ trợ từ khách truy cập';

  if (!message) {
    return { success: false, error: 'Vui lòng nhập nội dung chi tiết cần hỗ trợ.' };
  }

  const session = await auth();
  const guestName = data.name?.trim() || session?.user?.name || 'Khách truy cập';
  const guestContact = data.contact?.trim() || session?.user?.email || 'Chưa cung cấp';

  const ticket = await db.supportTicket.create({
    data: {
      userId: session?.user?.id || null,
      guestName,
      guestContact,
      subject,
      status: 'PENDING',
      messages: {
        create: {
          senderRole: 'USER',
          senderName: guestName,
          content: message,
          imageUrl: data.imageUrl || null,
        },
      },
    },
    include: {
      messages: true,
    },
  });

  // Gửi email thông báo tới Admin
  const adminEmail = siteConfig.author.email || 'dltoan07@gmail.com';
  try {
    await sendEmail({
      to: adminEmail,
      subject: `[Đơn Hỗ Trợ Mới - Chờ Duyệt] ${subject} (từ ${guestName})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <h2 style="color: #4f46e5; margin-top: 0;">🎧 Đơn yêu cầu hỗ trợ mới cần tiếp nhận</h2>
          <p>Khách hàng vừa gửi đơn yêu cầu hỗ trợ trực tiếp trên website <strong>${siteConfig.name}</strong>:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Mã đơn:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${ticket.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Người gửi:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${guestName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Liên hệ:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${guestContact}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Vấn đề:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">${subject}</td>
            </tr>
          </table>

          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; border-left: 4px solid #4f46e5; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #334155; margin-bottom: 6px;">Nội dung chi tiết:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #0f172a;">${message}</p>
            ${
              data.imageUrl
                ? `<p style="margin-top: 12px;"><a href="${siteConfig.url}${data.imageUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">👉 Xem hình ảnh đính kèm</a></p>`
                : ''
            }
          </div>

          <div style="margin-top: 24px;">
            <a href="${siteConfig.url}/admin/support" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Vào trang Trợ giúp để Xác nhận & Chat
            </a>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.warn('Lỗi khi gửi email thông báo hỗ trợ cho admin:', err);
  }

  revalidatePath('/admin/support');
  return { success: true, ticketId: ticket.id };
}

/**
 * Lấy thông tin chi tiết và lịch sử tin nhắn của đơn hỗ trợ
 */
export async function getTicketDetails(ticketId: string) {
  if (!ticketId) return null;

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return ticket;
}

/**
 * Khách hàng gửi tin nhắn bổ sung vào đơn hỗ trợ đang mở
 */
export async function sendTicketMessage(data: {
  ticketId: string;
  content: string;
  imageUrl?: string;
  senderName?: string;
}) {
  const content = data.content?.trim();
  if (!content && !data.imageUrl) {
    return { success: false, error: 'Vui lòng nhập nội dung tin nhắn hoặc đính kèm ảnh.' };
  }

  const ticket = await db.supportTicket.findUnique({
    where: { id: data.ticketId },
  });

  if (!ticket) {
    return { success: false, error: 'Không tìm thấy đơn hỗ trợ này.' };
  }

  // Nếu Admin đã đánh dấu hoàn tất: Đóng đoạn chat, user không thể chat nữa
  if (ticket.status === 'RESOLVED') {
    return {
      success: false,
      error:
        'Yêu cầu hỗ trợ này đã được Admin đánh dấu hoàn tất và đóng đoạn chat. Bạn không thể gửi thêm tin nhắn trừ khi Admin mở lại.',
    };
  }

  // Nếu đơn chưa được Admin xác nhận tiếp nhận: Vẫn ở trạng thái chờ
  if (ticket.status === 'PENDING') {
    return {
      success: false,
      error:
        'Đơn hỗ trợ đang ở trạng thái chờ Admin xác nhận tiếp nhận. Vui lòng đợi trong giây lát để Admin mở cổng trò chuyện.',
    };
  }

  const session = await auth();
  const senderName = data.senderName || session?.user?.name || ticket.guestName || 'Khách truy cập';

  await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderRole: 'USER',
      senderName,
      content: content || 'Đã gửi một hình ảnh đính kèm.',
      imageUrl: data.imageUrl || null,
    },
  });

  // Cập nhật updatedAt của ticket
  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath('/admin/support');
  return { success: true };
}

// ==========================================
// CÁC HÀNH ĐỘNG DÀNH RIÊNG CHO ADMIN
// ==========================================

/**
 * Admin lấy danh sách các đơn hỗ trợ
 */
export async function adminGetSupportTickets(filter?: SupportTicketStatus | 'ALL') {
  await requireAdmin();

  const where = filter && filter !== 'ALL' ? { status: filter } : {};

  const tickets = await db.supportTicket.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  return tickets;
}

/**
 * Admin thay đổi trạng thái của đơn hỗ trợ:
 * - PENDING: Chờ tiếp nhận
 * - IN_PROGRESS: Đang xử lý (xác nhận tiếp nhận, 2 bên chat với nhau)
 * - RESOLVED: Xử lý hoàn tất (đóng chat với admin, user không thể gửi tin nhắn nữa)
 */
export async function adminUpdateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  const session = await requireAdmin();

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error('Không tìm thấy đơn hỗ trợ.');
  }

  const updated = await db.supportTicket.update({
    where: { id: ticketId },
    data: { status, updatedAt: new Date() },
  });

  // Thêm tin nhắn hệ thống ghi nhận sự kiện chuyển trạng thái
  const adminDisplayName =
    session.user.name && session.user.name !== 'Admin' ? session.user.name : 'Hoàng Anh Toàn';

  let systemNote = '';
  if (status === 'IN_PROGRESS') {
    systemNote = `🟢 Admin ${adminDisplayName} đã xác nhận tiếp nhận đơn hỗ trợ. Cổng chat trực tiếp đã được kích hoạt!`;
  } else if (status === 'RESOLVED') {
    systemNote = `🏁 Admin ${adminDisplayName} đã đánh dấu hoàn tất xử lý yêu cầu. Đoạn chat này hiện đã được đóng. Cảm ơn bạn đã tin tưởng dịch vụ!`;
  } else if (status === 'PENDING') {
    systemNote = `⏳ Trạng thái chuyển về chờ tiếp nhận.`;
  }

  if (systemNote) {
    await db.supportMessage.create({
      data: {
        ticketId,
        senderRole: 'ADMIN',
        senderName: 'Hệ thống hỗ trợ',
        content: systemNote,
      },
    });
  }

  revalidatePath('/admin/support');
  return updated;
}

/**
 * Admin gửi tin nhắn trả lời trong đơn chat
 */
export async function adminSendTicketMessage(data: {
  ticketId: string;
  content: string;
  imageUrl?: string;
}) {
  const session = await requireAdmin();
  const content = data.content?.trim();

  if (!content && !data.imageUrl) {
    throw new Error('Vui lòng nhập nội dung tin nhắn hoặc đính kèm ảnh.');
  }

  const ticket = await db.supportTicket.findUnique({
    where: { id: data.ticketId },
  });

  if (!ticket) {
    throw new Error('Không tìm thấy đơn hỗ trợ.');
  }

  // Nếu ticket đang ở PENDING mà admin gửi tin nhắn thì tự động chuyển sang IN_PROGRESS
  if (ticket.status === 'PENDING') {
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'IN_PROGRESS', updatedAt: new Date() },
    });
  } else {
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });
  }

  const adminName =
    session.user.name && session.user.name !== 'Admin' ? session.user.name : 'Hoàng Anh Toàn';

  const message = await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderRole: 'ADMIN',
      senderName: adminName,
      content: content || 'Đã gửi một hình ảnh đính kèm.',
      imageUrl: data.imageUrl || null,
    },
  });

  revalidatePath('/admin/support');
  return { success: true, message };
}
