import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const { mockSetting, mockAnnouncement } = vi.hoisted(() => ({
  mockSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  mockAnnouncement: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    systemSetting: mockSetting,
    systemAnnouncement: mockAnnouncement,
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getLoginAdConfig,
  saveLoginAdConfig,
  createAnnouncement,
  getActiveBannerAnnouncement,
  getPublicActiveAnnouncements,
  toggleAnnouncementState,
  deleteAnnouncement,
  type LoginAdConfig,
} from '@/server/actions/settings';

// `auth` của NextAuth là hàm overload nên vi.mocked() không suy ra được kiểu trả về.
const mockAuth = auth as unknown as Mock<
  () => Promise<{ user: { id: string; role: string } } | null>
>;

describe('Admin Settings & Login Ad Popup Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Quyền truy cập (Admin RBAC)', () => {
    it('Chặn người dùng chưa đăng nhập khi lưu quảng cáo', async () => {
      mockAuth.mockResolvedValueOnce(null);
      await expect(
        saveLoginAdConfig({
          enabled: true,
          imageUrl: 'https://example.com/banner.jpg',
          title: 'Ưu đãi',
          linkUrl: '/shop',
          countdownSeconds: 5,
          targetAudience: 'authenticated',
          frequency: 'once_per_session',
        }),
      ).rejects.toThrow('Bạn không có quyền');
    });

    it('Chặn người dùng có Role USER khi truy cập settings', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'u1', role: 'USER' },
      });
      await expect(getLoginAdConfig()).rejects.toThrow('Bạn không có quyền');
    });
  });

  describe('2. Cấu hình quảng cáo đăng nhập (Login Ad Config)', () => {
    it('Trả về cấu hình mặc định nếu chưa có cấu hình trong DB', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });
      mockSetting.findUnique.mockResolvedValueOnce(null);

      const config = await getLoginAdConfig();
      expect(config.enabled).toBe(false);
      expect(config.countdownSeconds).toBe(5);
      expect(config.targetAudience).toBe('authenticated');
    });

    it('Lỗi khi bật quảng cáo mà không cung cấp ảnh quảng cáo', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const res = await saveLoginAdConfig({
        enabled: true,
        imageUrl: '',
        title: 'QC không ảnh',
        linkUrl: '',
        countdownSeconds: 5,
        targetAudience: 'authenticated',
        frequency: 'once_per_session',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('hình ảnh');
    });

    it('Lưu thành công khi cấu hình hợp lệ và hợp chuẩn đếm ngược 5s', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });
      mockSetting.upsert.mockResolvedValueOnce({
        id: 's1',
        key: 'login_ad_popup_config',
        value: '{}',
        updatedAt: new Date(),
      });

      const validConfig: LoginAdConfig = {
        enabled: true,
        imageUrl: 'https://example.com/banner-promo.png',
        title: 'Giảm giá 50% cho học viên mới',
        linkUrl: '/courses',
        countdownSeconds: 5,
        targetAudience: 'authenticated',
        frequency: 'once_per_session',
      };

      const res = await saveLoginAdConfig(validConfig);
      expect(res.success).toBe(true);
      expect(res.config?.countdownSeconds).toBe(5);
      expect(mockSetting.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Quản lý thông báo tính năng hệ thống (System Announcements)', () => {
    it('Tạo thông báo Sản phẩm mới thành công', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const fakeItem = {
        id: 'ann-1',
        title: 'Sản phẩm mới: Bộ Theme Dashboard',
        content: 'Đã có sẵn trên Shop với đầy đủ mã nguồn và tài liệu.',
        type: 'NEW_PRODUCT' as const,
        badge: 'Sản phẩm mới',
        linkUrl: '/shop',
        linkText: 'Xem sản phẩm',
        isActive: true,
        showBanner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnnouncement.create.mockResolvedValueOnce(fakeItem);

      const res = await createAnnouncement({
        title: fakeItem.title,
        content: fakeItem.content,
        type: 'NEW_PRODUCT',
        badge: 'Sản phẩm mới',
        linkUrl: '/shop',
        linkText: 'Xem sản phẩm',
        isActive: true,
        showBanner: true,
      });

      expect(res.success).toBe(true);
      expect(res.item?.type).toBe('NEW_PRODUCT');
      expect(res.item?.title).toBe(fakeItem.title);
    });

    it('Tạo thông báo Voucher ưu đãi thành công', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      mockAnnouncement.create.mockResolvedValueOnce({
        id: 'ann-2',
        title: 'Mã giảm giá KHUYENMAI20',
        content: 'Giảm 20% toàn bộ đơn hàng.',
        type: 'VOUCHER' as const,
        badge: 'Voucher HOT',
        linkUrl: '/vouchers',
        linkText: 'Nhận mã',
        isActive: true,
        showBanner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await createAnnouncement({
        title: 'Mã giảm giá KHUYENMAI20',
        content: 'Giảm 20% toàn bộ đơn hàng.',
        type: 'VOUCHER',
        badge: 'Voucher HOT',
        linkUrl: '/vouchers',
        linkText: 'Nhận mã',
        isActive: true,
        showBanner: true,
      });

      expect(res.success).toBe(true);
      expect(res.item?.type).toBe('VOUCHER');
    });

    it('Lấy thông báo banner đang kích hoạt gần nhất cho khách xem', async () => {
      mockAnnouncement.findFirst.mockResolvedValueOnce({
        id: 'ann-top',
        title: 'Chào mừng thành viên',
        content: 'Khám phá ngay các ưu đãi đặc biệt.',
        type: 'NEW_PRODUCT',
        isActive: true,
        showBanner: true,
      });

      const active = await getActiveBannerAnnouncement();
      expect(active?.title).toBe('Chào mừng thành viên');
    });

    it('Bật/tắt trạng thái thông báo', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      mockAnnouncement.findUnique.mockResolvedValueOnce({ isActive: true });
      mockAnnouncement.update.mockResolvedValueOnce({ isActive: false });

      const res = await toggleAnnouncementState('ann-1', 'isActive');
      expect(res.success).toBe(true);
      expect(res.newValue).toBe(false);
    });

    it('Xóa thông báo', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      mockAnnouncement.delete.mockResolvedValueOnce({ id: 'ann-1' });
      const res = await deleteAnnouncement('ann-1');
      expect(res.success).toBe(true);
    });

    it('Lấy danh sách thông báo cho chuông NotificationBell (getPublicActiveAnnouncements)', async () => {
      const mockList = [
        {
          id: 'ann-1',
          title: 'Sản phẩm mới ra mắt',
          content: 'Nội dung 1',
          type: 'NEW_PRODUCT',
          isActive: true,
        },
        {
          id: 'ann-2',
          title: 'Mã voucher giảm 20%',
          content: 'Nội dung 2',
          type: 'VOUCHER',
          isActive: true,
        },
      ];
      mockAnnouncement.findMany.mockResolvedValueOnce(mockList);

      const items = await getPublicActiveAnnouncements();
      expect(items.length).toBe(2);
      expect(mockAnnouncement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          take: 20,
        }),
      );
    });

    it('Tính toán chính xác số lượng thông báo chưa đọc (unreadCount)', () => {
      const allAnnouncements = [
        { id: 'tb-1', title: 'Sản phẩm mới' },
        { id: 'tb-2', title: 'Voucher 30%' },
        { id: 'tb-3', title: 'Tính năng mới' },
      ];

      // Khi người dùng chưa đọc thông báo nào
      let readIds: string[] = [];
      let unread = allAnnouncements.filter((a) => !readIds.includes(a.id));
      expect(unread.length).toBe(3);

      // Khi người dùng đã đọc 1 thông báo
      readIds = ['tb-1'];
      unread = allAnnouncements.filter((a) => !readIds.includes(a.id));
      expect(unread.length).toBe(2);

      // Khi người dùng bấm "Đã đọc tất cả"
      readIds = allAnnouncements.map((a) => a.id);
      unread = allAnnouncements.filter((a) => !readIds.includes(a.id));
      expect(unread.length).toBe(0);
    });
  });
});
