import { getAnnouncements, getLoginAdConfig } from '@/server/actions/settings';
import { SettingsManager } from '@/components/admin/settings-manager';

export const metadata = {
  title: 'Cài đặt hệ thống & Quảng cáo | Quản trị',
  description: 'Quản lý thông báo tính năng hệ thống, voucher và popup quảng cáo đăng nhập.',
};

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [adConfig, announcements] = await Promise.all([getLoginAdConfig(), getAnnouncements()]);

  return (
    <div className="space-y-6">
      <SettingsManager initialAdConfig={adConfig} initialAnnouncements={announcements} />
    </div>
  );
}
