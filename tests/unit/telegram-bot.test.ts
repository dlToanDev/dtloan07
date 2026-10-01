/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escapeHtml, getTelegramConfig } from '@/lib/telegram/config';
import {
  formatVnd,
  mainMenuKeyboard,
  categoryKeyboard,
  accountSubCategoryKeyboard,
  productsListKeyboard,
  productDetailKeyboard,
  orderPaymentKeyboard,
  isValidTelegramUrl,
  persistentReplyKeyboard,
} from '@/lib/telegram/keyboards';
import {
  initiateCheckout,
  processOrderCreation,
  handleCancelOrder,
  handleCheckOrder,
} from '@/lib/telegram/handlers/order';
import { searchProductsOrOrders } from '@/lib/telegram/handlers/search';
import { sendTelegramOrderDelivery } from '@/lib/telegram/delivery';
import { db } from '@/lib/db';
import { bot } from '@/lib/telegram/bot';

describe('Telegram Sales Bot (Accounts & Source Code) Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Cấu hình & Utility Functions', () => {
    it('escapeHtml mã hóa các ký tự nhạy cảm trong Telegram HTML parse mode', () => {
      const input = '<script>alert("xss & test")</script>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss &amp; test&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });

    it('formatVnd định dạng số tiền chuẩn VND', () => {
      expect(formatVnd(250000)).toMatch(/250[.,]000\s*đ/);
      expect(formatVnd(0)).toMatch(/0\s*đ/);
    });

    it('getTelegramConfig đọc cấu hình từ process.env', () => {
      const config = getTelegramConfig();
      expect(typeof config.username).toBe('string');
      expect(typeof config.isConfigured).toBe('boolean');
    });
  });

  describe('2. Inline Keyboards UI', () => {
    it('isValidTelegramUrl lọc bỏ các URL localhost hoặc IP nội bộ không hợp lệ với Telegram', () => {
      expect(isValidTelegramUrl('http://localhost:5000')).toBe(false);
      expect(isValidTelegramUrl('http://127.0.0.1:3000')).toBe(false);
      expect(isValidTelegramUrl('https://dltoan07.com')).toBe(true);
      expect(isValidTelegramUrl('')).toBe(false);
    });

    it('mainMenuKeyboard chứa các nút điều hướng danh mục chính (ACCOUNT, DOWNLOAD) và hỗ trợ', () => {
      const kb = mainMenuKeyboard();
      const buttons = kb.inline_keyboard.flat();
      const callbackDatas = buttons.map((b: any) => b.callback_data).filter(Boolean);

      expect(callbackDatas).toContain('cat:ACCOUNT');
      expect(callbackDatas).toContain('cat:DOWNLOAD');
      expect(callbackDatas).toContain('nav:orders');
      expect(callbackDatas).toContain('nav:support');
    });

    it('categoryKeyboard cho phép chọn các nhóm sản phẩm chính (ACCOUNT, DOWNLOAD)', () => {
      const kb = categoryKeyboard();
      const buttons = kb.inline_keyboard.flat();
      const callbackDatas = buttons.map((b: any) => b.callback_data);

      expect(callbackDatas).toContain('cat:ACCOUNT');
      expect(callbackDatas).toContain('cat:DOWNLOAD');
      expect(callbackDatas).toContain('nav:menu');
      expect(callbackDatas).not.toContain('cat:PHYSICAL');
    });

    it('accountSubCategoryKeyboard cho phép chọn Cloud VPS và Cloud VDS bên trong mục Tài khoản bản quyền', () => {
      const kb = accountSubCategoryKeyboard(false);
      const buttons = kb.inline_keyboard.flat();
      const callbackDatas = buttons.map((b: any) => b.callback_data);

      expect(callbackDatas).toContain('cat:VPS');
      expect(callbackDatas).toContain('cat:VDS');
      expect(callbackDatas).toContain('nav:categories');
      expect(callbackDatas).toContain('nav:menu');
    });

    it('productsListKeyboard tạo danh sách sản phẩm và các nút quay lại', () => {
      const kb = productsListKeyboard([
        { id: 'p1', name: 'Cloud VPS 10', minPrice: 279000, stockText: 'Có sẵn' },
      ]);
      const buttons = kb.inline_keyboard.flat();
      expect(buttons.some((b: any) => b.callback_data === 'prod:p1')).toBe(true);
      expect(buttons.some((b: any) => b.callback_data === 'nav:menu')).toBe(true);
    });

    it('productDetailKeyboard hiển thị đúng nút mua hàng và trạng thái hết hàng', () => {
      const kb = productDetailKeyboard({
        productId: 'prod-1',
        category: 'ACCOUNT',
        variants: [
          { id: 'var-1', name: 'Gói 1 tháng', priceVnd: 150000, isAvailable: true },
          { id: 'var-2', name: 'Gói 1 năm', priceVnd: 1200000, isAvailable: false },
        ],
      });

      const buttons = kb.inline_keyboard.flat();
      const buyBtn = buttons.find((b: any) => b.callback_data === 'buy:var-1');
      expect(buyBtn).toBeDefined();
      expect(buyBtn?.text).toContain('Gói 1 tháng');

      const outOfStockBtn = buttons.find((b: any) => b.callback_data === 'noop');
      expect(outOfStockBtn).toBeDefined();
      expect(outOfStockBtn?.text).toContain('Hết hàng');
    });

    it('orderPaymentKeyboard chứa URL thanh toán PayOS và nút kiểm tra / hủy đơn', () => {
      const kb = orderPaymentKeyboard('https://payos.vn/checkout/xyz123', 'DH-123456');
      const buttons = kb.inline_keyboard.flat();

      const payBtn = buttons.find((b: any) => b.url === 'https://payos.vn/checkout/xyz123');
      expect(payBtn).toBeDefined();

      const checkBtn = buttons.find((b: any) => b.callback_data === 'check:DH-123456');
      expect(checkBtn).toBeDefined();

      const cancelBtn = buttons.find((b: any) => b.callback_data === 'cancel:DH-123456');
      expect(cancelBtn).toBeDefined();
    });

    it('persistentReplyKeyboard hiển thị các nút điều hướng menu nhanh', () => {
      const kb = persistentReplyKeyboard();
      const keyboardRows = (kb as any).keyboard;
      const texts = keyboardRows.flat().map((btn: any) => btn.text);

      expect(texts).toContain('📦 Sản phẩm');
      expect(texts).toContain('📋 Đơn hàng');
      expect(texts).toContain('🔍 Tìm kiếm');
      expect(texts).toContain('💬 Hỗ trợ');
      expect(texts).toContain('🏠 Menu chính');
    });
  });

  describe('3. Đặt hàng & Kiểm soát đơn hàng (Order Creation)', () => {
    it('từ chối khi email không hợp lệ', async () => {
      const replyMock = vi.fn();
      const mockCtx: any = {
        chat: { id: 123456789 },
        from: { id: 123456789, first_name: 'Toan' },
        reply: replyMock,
      };

      await processOrderCreation(mockCtx, 'var-1', 'invalid-email');
      expect(replyMock).toHaveBeenCalledWith(expect.stringContaining('Email không đúng định dạng'));
    });

    it('chặn spam: từ chối tạo đơn nếu user đã có từ 3 đơn PENDING trở lên', async () => {
      vi.spyOn(db.productVariant, 'findUnique').mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        priceVnd: 100000,
        name: 'Gói chuẩn',
        active: true,
        product: {
          id: 'prod-1',
          name: 'ChatGPT Plus',
          status: 'ACTIVE',
          type: 'ACCOUNT',
          deliveryMode: 'AUTO',
        },
      } as any);

      vi.spyOn(db.order, 'count').mockResolvedValue(3);

      const replyMock = vi.fn();
      const mockCtx: any = {
        chat: { id: 123456789 },
        from: { id: 123456789, first_name: 'Toan' },
        reply: replyMock,
      };

      await processOrderCreation(mockCtx, 'var-1', 'valid@example.com');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Bạn đang có 3 đơn hàng đang chờ thanh toán'),
        expect.anything(),
      );
    });

    it('từ chối bán nếu sản phẩm đã bị tắt hiển thị trên Telegram (showOnTelegram: false)', async () => {
      vi.spyOn(db.productVariant, 'findUnique').mockResolvedValue({
        id: 'var-disabled-tele',
        productId: 'prod-tele',
        priceVnd: 200000,
        name: 'Cloud VPS 10',
        active: true,
        product: {
          id: 'prod-tele',
          name: 'Cloud VPS 10',
          status: 'ACTIVE',
          type: 'ACCOUNT',
          showOnTelegram: false,
        },
      } as any);

      const replyMock = vi.fn();
      const mockCtx: any = {
        chat: { id: 123456789 },
        from: { id: 123456789 },
        reply: replyMock,
      };

      await processOrderCreation(mockCtx, 'var-disabled-tele', 'toan@example.com');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('không còn khả dụng trên Telegram'),
        expect.anything(),
      );
    });

    it('từ chối bán nếu sản phẩm là loại PHYSICAL (chỉ hỗ trợ ACCOUNT và DOWNLOAD)', async () => {
      vi.spyOn(db.productVariant, 'findUnique').mockResolvedValue({
        id: 'var-physical',
        productId: 'prod-physical',
        priceVnd: 500000,
        name: 'Áo thun lập trình viên',
        active: true,
        product: {
          id: 'prod-physical',
          name: 'Áo thun',
          status: 'ACTIVE',
          type: 'PHYSICAL',
        },
      } as any);

      const replyMock = vi.fn();
      const mockCtx: any = {
        chat: { id: 123456789 },
        from: { id: 123456789 },
        reply: replyMock,
      };

      await processOrderCreation(mockCtx, 'var-physical', 'toan@example.com');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Bot chỉ hỗ trợ bán sản phẩm số'),
      );
    });

    it('báo hết hàng nếu tài khoản tự động (AUTO) không còn trong kho AccountStock', async () => {
      vi.spyOn(db.productVariant, 'findUnique').mockResolvedValue({
        id: 'var-account',
        productId: 'prod-account',
        priceVnd: 200000,
        name: 'Tài khoản Pro',
        active: true,
        product: {
          id: 'prod-account',
          name: 'Cursor Pro',
          status: 'ACTIVE',
          type: 'ACCOUNT',
          deliveryMode: 'AUTO',
        },
      } as any);

      vi.spyOn(db.order, 'count').mockResolvedValue(0);
      vi.spyOn(db.accountStock, 'count').mockResolvedValue(0);

      const replyMock = vi.fn();
      const mockCtx: any = {
        chat: { id: 123456789 },
        from: { id: 123456789 },
        reply: replyMock,
      };

      await processOrderCreation(mockCtx, 'var-account', 'toan@example.com');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('tạm hết tài khoản trong kho'),
        expect.anything(),
      );
    });

    it('initiateCheckout tạo đơn và hiển thị mã VietQR ngay lập tức không bắt user gõ email', async () => {
      const mockVariant = {
        id: 'var-sourcecode',
        productId: 'prod-sourcecode',
        priceVnd: 150000,
        name: 'Bản quyền Full Source',
        active: true,
        product: {
          id: 'prod-sourcecode',
          name: 'Next.js SaaS Template',
          status: 'ACTIVE',
          type: 'DOWNLOAD',
          deliveryMode: null,
        },
      };

      vi.spyOn(db.productVariant, 'findUnique').mockResolvedValue(mockVariant as any);
      vi.spyOn(db.order, 'count').mockResolvedValue(0);
      vi.spyOn(db, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            create: vi.fn().mockResolvedValue({
              id: 'order-123',
              orderCode: 'DH-12345678',
              items: [{ id: 'item-1' }],
            }),
          },
        };
        return cb(tx);
      });

      const replyWithPhotoMock = vi.fn();
      const replyMock = vi.fn();
      const mockCtx: any = {
        chat: { id: 987654321 },
        from: { id: 987654321, username: 'dltoan_buyer', first_name: 'Toan' },
        replyWithPhoto: replyWithPhotoMock,
        reply: replyMock,
      };

      await initiateCheckout(mockCtx, 'var-sourcecode');

      const sentPhoto = replyWithPhotoMock.mock.calls.length > 0;
      const sentText = replyMock.mock.calls.length > 0;
      expect(sentPhoto || sentText).toBe(true);

      const caption = (
        sentPhoto ? replyWithPhotoMock.mock.calls[0]?.[1]?.caption : replyMock.mock.calls[0]?.[0]
      ) as string;

      expect(caption).toBeDefined();
      expect(caption).toContain('ĐƠN HÀNG MỚI ĐÃ KHỞI TẠO');
      expect(caption).toContain('Next.js SaaS Template');
      expect(caption).not.toContain('Email nhận hàng:');
    });
  });

  describe('4. Tra cứu & Hủy đơn hàng', () => {
    it('handleCheckOrder báo đang chờ nếu đơn hàng PENDING', async () => {
      vi.spyOn(db.order, 'findUnique').mockResolvedValue({
        id: 'order-1',
        orderCode: 'DH-123456',
        status: 'PENDING',
        totalVnd: 250000,
        items: [],
      } as any);

      const replyMock = vi.fn();
      const mockCtx: any = { reply: replyMock };

      await handleCheckOrder(mockCtx, 'DH-123456');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('CHỜ THANH TOÁN (PENDING)'),
        expect.anything(),
      );
    });

    it('handleCancelOrder giải phóng kho và cập nhật đơn khi user bấm hủy', async () => {
      vi.spyOn(db.order, 'findUnique').mockResolvedValue({
        id: 'order-1',
        orderCode: 'DH-123456',
        status: 'PENDING',
      } as any);

      const updateMock = vi.fn().mockResolvedValue({});
      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          order: { update: updateMock },
          orderItem: { findMany: vi.fn().mockResolvedValue([]) },
          accountStock: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        });
      });

      const replyMock = vi.fn();
      const mockCtx: any = { reply: replyMock };

      await handleCancelOrder(mockCtx, 'DH-123456');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Đã hủy đơn hàng'),
        expect.anything(),
      );
    });

    it('handleCancelOrder trên tin nhắn ảnh VietQR sẽ xóa ảnh cũ và gửi thông báo hủy an toàn (không bị lỗi 400)', async () => {
      vi.spyOn(db.order, 'findUnique').mockResolvedValue({
        id: 'order-qr',
        orderCode: 'DH-QR123',
        status: 'PENDING',
      } as any);

      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          order: { update: vi.fn().mockResolvedValue({}) },
          orderItem: { findMany: vi.fn().mockResolvedValue([]) },
          accountStock: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        });
      });

      const deleteMessageMock = vi.fn().mockResolvedValue(true);
      const replyMock = vi.fn().mockResolvedValue({});
      const mockCtx: any = {
        callbackQuery: {
          data: 'cancel:DH-QR123',
          message: {
            message_id: 100,
            photo: [{ file_id: 'photo-1' }],
          },
        },
        deleteMessage: deleteMessageMock,
        reply: replyMock,
      };

      await handleCancelOrder(mockCtx, 'DH-QR123');

      expect(deleteMessageMock).toHaveBeenCalled();
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Đã hủy đơn hàng <code>DH-QR123</code> thành công'),
        expect.anything(),
      );
    });

    it('handleCancelOrder báo đơn đã hủy nếu bấm hủy lại lần 2', async () => {
      vi.spyOn(db.order, 'findUnique').mockResolvedValue({
        id: 'order-already-cancelled',
        orderCode: 'DH-CANCELLED',
        status: 'FAILED',
        cancelledAt: new Date(),
      } as any);

      const replyMock = vi.fn().mockResolvedValue({});
      const mockCtx: any = { reply: replyMock };

      await handleCancelOrder(mockCtx, 'DH-CANCELLED');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('đã ở trạng thái <b>ĐÃ HỦY</b> trước đó'),
        expect.anything(),
      );
    });
  });

  describe('5. Bàn giao tự động qua Telegram (Delivery)', () => {
    it('sendTelegramOrderDelivery bỏ qua nếu đơn hàng không có telegramChatId', async () => {
      vi.spyOn(db.order, 'findUnique').mockResolvedValue({
        id: 'order-web',
        orderCode: 'DH-WEB-1',
        telegramChatId: null,
      } as any);

      const result = await sendTelegramOrderDelivery('order-web');
      expect(result).toBe(false);
    });

    it('sendTelegramOrderDelivery gửi mã license và link tải Cloudflare R2 cho đơn DOWNLOAD', async () => {
      vi.spyOn(db.order, 'findUnique').mockResolvedValue({
        id: 'order-dl',
        orderCode: 'DH-999999',
        totalVnd: 500000,
        email: 'customer@gmail.com',
        telegramChatId: '987654321',
        items: [
          {
            id: 'item-1',
            productId: 'prod-source',
            productNameSnapshot: 'Full Source Code Next.js Blog',
            license: {
              id: 'lic-123',
              key: 'LIC-ABC-XYZ-2026',
              maxDownloads: 5,
            },
          },
        ],
      } as any);

      vi.spyOn(db.accountStock, 'findMany').mockResolvedValue([]);

      const sendMessageSpy = vi.spyOn(bot.api, 'sendMessage').mockResolvedValue({} as any);

      const result = await sendTelegramOrderDelivery('order-dl');
      expect(result).toBe(true);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        '987654321',
        expect.stringContaining('LIC-ABC-XYZ-2026'),
        expect.anything(),
      );
    });
  });

  describe('6. Tìm kiếm sản phẩm & An toàn truy vấn (Search Handler)', () => {
    it('lọc bỏ emoji khi tìm kiếm và nhắc nhở nếu từ khóa rỗng hoặc chỉ có icon', async () => {
      const replyMock = vi.fn();
      const mockCtx: any = { reply: replyMock };

      await searchProductsOrOrders(mockCtx, '📦');
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Vui lòng nhập từ khóa tìm kiếm'),
        expect.anything(),
      );
    });

    it('loại bỏ icon/emoji trước khi truy vấn PostgreSQL để tránh lỗi collation', async () => {
      const replyMock = vi.fn();
      const mockCtx: any = { reply: replyMock };

      const findManySpy = vi.spyOn(db.product, 'findMany').mockResolvedValue([]);

      await searchProductsOrOrders(mockCtx, '📦 VPS 16GB');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'VPS 16GB', mode: 'insensitive' } },
              { description: { contains: 'VPS 16GB', mode: 'insensitive' } },
            ],
          }),
        }),
      );
      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy sản phẩm nào khớp với từ khóa'),
        expect.anything(),
      );
    });

    it('trả về menu danh mục fallback an toàn nếu truy vấn database phát sinh lỗi', async () => {
      const replyMock = vi.fn();
      const mockCtx: any = { reply: replyMock };

      vi.spyOn(db.product, 'findMany').mockRejectedValue(new Error('DB Connection Timeout'));

      await searchProductsOrOrders(mockCtx, 'ChatGPT');

      expect(replyMock).toHaveBeenCalledWith(
        expect.stringContaining('Không thể tìm kiếm lúc này'),
        expect.objectContaining({
          reply_markup: expect.anything(),
        }),
      );
    });
  });
});
