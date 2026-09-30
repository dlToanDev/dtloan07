import { getAnnouncements, getLoginAdConfig, getHeroBannerConfig } from '@/server/actions/settings';
import { getAdminSecurityOverview } from '@/server/actions/admin-token';
import { SettingsManager } from '@/components/admin/settings-manager';
import { AdminTokenManager } from '@/components/admin/admin-token-manager';

export const metadata = {
  title: 'Cài đặt hệ thống & Bảo mật | Quản trị',
  description:
    'Quản lý bảo mật URL Admin, thông báo tính năng, voucher và banner quảng cáo trang chủ.',
};

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [adConfig, announcements, heroBannerConfig, securityOverview] = await Promise.all([
    getLoginAdConfig(),
    getAnnouncements(),
    getHeroBannerConfig(),
    getAdminSecurityOverview(),
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Khu vực quản lý Bảo mật URL Token động & Nhật ký Audit */}
      <AdminTokenManager initialData={securityOverview} />

      {/* 2. Cài đặt cấu hình trang & Thông báo hệ thống */}
      <SettingsManager
        initialAdConfig={adConfig}
        initialAnnouncements={announcements}
        initialHeroBannerConfig={heroBannerConfig}
      />
    </div>
  );
}
