import { getAnnouncements, getLoginAdConfig, getHeroBannerConfig } from '@/server/actions/settings';
import { SettingsManager } from '@/components/admin/settings-manager';

export const metadata = {
  title: 'Cài đặt hệ thống & Quảng cáo | Quản trị',
  description: 'Quản lý thông báo tính năng hệ thống, voucher và banner quảng cáo trang chủ.',
};

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [adConfig, announcements, heroBannerConfig] = await Promise.all([
    getLoginAdConfig(),
    getAnnouncements(),
    getHeroBannerConfig(),
  ]);

  return (
    <div className="space-y-6">
      <SettingsManager
        initialAdConfig={adConfig}
        initialAnnouncements={announcements}
        initialHeroBannerConfig={heroBannerConfig}
      />
    </div>
  );
}
