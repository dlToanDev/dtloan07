/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupportTicketStatus } from '@prisma/client';

// Mock lib/db and lib/auth
vi.mock('@/lib/db', () => ({
  db: {
    supportTicket: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    supportMessage: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/mail', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  createSupportTicket,
  getTicketDetails,
  sendTicketMessage,
  adminGetSupportTickets,
  adminUpdateTicketStatus,
  adminSendTicketMessage,
} from '@/server/actions/support';

describe('Support Ticket & Live Chat System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSupportTicket', () => {
    it('trả về lỗi nếu không có nội dung message', async () => {
      const res = await createSupportTicket({
        subject: 'Cần hỗ trợ',
        message: '   ',
      });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('tạo ticket mới với trạng thái PENDING', async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(db.supportTicket.create).mockResolvedValue({
        id: 'ticket-123',
        status: 'PENDING',
        subject: 'Lỗi nạp tiền',
      } as any);

      const res = await createSupportTicket({
        name: 'Khách hàng',
        contact: '0798566374',
        subject: 'Lỗi nạp tiền',
        message: 'Tôi vừa chuyển khoản nhưng chưa thấy tiền vào ví',
      });

      expect(res.success).toBe(true);
      expect(res.ticketId).toBe('ticket-123');
      expect(db.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            guestName: 'Khách hàng',
            guestContact: '0798566374',
            subject: 'Lỗi nạp tiền',
          }),
        }),
      );
    });
  });

  describe('sendTicketMessage (User gửi tin nhắn)', () => {
    it('chặn gửi tin nhắn nếu ticket đang ở trạng thái PENDING (chờ duyệt)', async () => {
      vi.mocked(db.supportTicket.findUnique).mockResolvedValue({
        id: 'ticket-123',
        status: 'PENDING',
      } as any);

      const res = await sendTicketMessage({
        ticketId: 'ticket-123',
        content: 'Alo admin ơi',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('chờ Admin xác nhận');
    });

    it('chặn gửi tin nhắn nếu ticket đã được đánh dấu RESOLVED (hoàn tất)', async () => {
      vi.mocked(db.supportTicket.findUnique).mockResolvedValue({
        id: 'ticket-123',
        status: 'RESOLVED',
      } as any);

      const res = await sendTicketMessage({
        ticketId: 'ticket-123',
        content: 'Tôi muốn chat tiếp',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('hoàn tất và đóng đoạn chat');
    });

    it('cho phép gửi tin nhắn khi ticket đang ở trạng thái IN_PROGRESS', async () => {
      vi.mocked(db.supportTicket.findUnique).mockResolvedValue({
        id: 'ticket-123',
        status: 'IN_PROGRESS',
        guestName: 'Khách hàng',
      } as any);
      vi.mocked(db.supportMessage.create).mockResolvedValue({ id: 'msg-1' } as any);
      vi.mocked(db.supportTicket.update).mockResolvedValue({ id: 'ticket-123' } as any);

      const res = await sendTicketMessage({
        ticketId: 'ticket-123',
        content: 'Đã gửi hình ảnh bill',
      });

      expect(res.success).toBe(true);
      expect(db.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-123',
            senderRole: 'USER',
            content: 'Đã gửi hình ảnh bill',
          }),
        }),
      );
    });
  });

  describe('adminUpdateTicketStatus', () => {
    it('từ chối nếu không phải ADMIN', async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      await expect(adminUpdateTicketStatus('ticket-123', 'IN_PROGRESS')).rejects.toThrow(
        'Bạn không có quyền thực hiện thao tác quản trị này.',
      );
    });

    it('chuyển trạng thái sang IN_PROGRESS và ghi chú hệ thống', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Hoàng Anh Toàn' },
      } as any);
      vi.mocked(db.supportTicket.findUnique).mockResolvedValue({
        id: 'ticket-123',
        status: 'PENDING',
      } as any);
      vi.mocked(db.supportTicket.update).mockResolvedValue({
        id: 'ticket-123',
        status: 'IN_PROGRESS',
      } as any);

      const res = await adminUpdateTicketStatus('ticket-123', 'IN_PROGRESS');
      expect(res.status).toBe('IN_PROGRESS');
      expect(db.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-123',
            senderRole: 'ADMIN',
            senderName: 'Hệ thống hỗ trợ',
            content: expect.stringContaining('đã xác nhận tiếp nhận đơn hỗ trợ'),
          }),
        }),
      );
    });

    it('chuyển trạng thái sang RESOLVED và đóng đoạn chat', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Hoàng Anh Toàn' },
      } as any);
      vi.mocked(db.supportTicket.findUnique).mockResolvedValue({
        id: 'ticket-123',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(db.supportTicket.update).mockResolvedValue({
        id: 'ticket-123',
        status: 'RESOLVED',
      } as any);

      const res = await adminUpdateTicketStatus('ticket-123', 'RESOLVED');
      expect(res.status).toBe('RESOLVED');
      expect(db.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-123',
            content: expect.stringContaining('đã đánh dấu hoàn tất xử lý yêu cầu'),
          }),
        }),
      );
    });
  });

  describe('adminSendTicketMessage', () => {
    it('admin gửi tin nhắn tự động mở IN_PROGRESS nếu ticket đang PENDING', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin HVP' },
      } as any);
      vi.mocked(db.supportTicket.findUnique).mockResolvedValue({
        id: 'ticket-123',
        status: 'PENDING',
      } as any);
      vi.mocked(db.supportTicket.update).mockResolvedValue({ id: 'ticket-123' } as any);
      vi.mocked(db.supportMessage.create).mockResolvedValue({ id: 'msg-admin' } as any);

      const res = await adminSendTicketMessage({
        ticketId: 'ticket-123',
        content: 'Tôi đang kiểm tra cho bạn',
      });

      expect(res.success).toBe(true);
      expect(db.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });
  });
});
