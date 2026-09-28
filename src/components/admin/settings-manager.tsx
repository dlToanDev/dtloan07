'use client';

import { useState, useRef, useTransition } from 'react';
import {
  type LoginAdConfig,
  type AnnouncementItem,
  type AnnouncementType,
  saveLoginAdConfig,
  uploadAdImage,
  createAnnouncement,
  toggleAnnouncementState,
  deleteAnnouncement,
} from '@/server/actions/settings';
import {
  Sparkles,
  Megaphone,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Upload,
  Tag,
  Package,
  Rocket,
  Info,
  Settings,
  X,
  Radio,
} from 'lucide-react';
import Link from 'next/link';

interface SettingsManagerProps {
  initialAdConfig: LoginAdConfig;
  initialAnnouncements: AnnouncementItem[];
}

export function SettingsManager({ initialAdConfig, initialAnnouncements }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<'ad' | 'announcements'>('ad');

  // ==========================================
  // STATE: CẤU HÌNH QUẢNG CÁO ĐĂNG NHẬP
  // ==========================================
  const [adConfig, setAdConfig] = useState<LoginAdConfig>(initialAdConfig);
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [adMessage, setAdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // State Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCountdown, setPreviewCountdown] = useState(5);
  const [previewCanClose, setPreviewCanClose] = useState(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // STATE: THÔNG BÁO TÍNH NĂNG HỆ THỐNG
  // ==========================================
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [isCreatingAnnounce, setIsCreatingAnnounce] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  // Form thêm thông báo mới
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<AnnouncementType>('NEW_PRODUCT');
  const [newBadge, setNewBadge] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkText, setNewLinkText] = useState('Xem ngay');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newShowBanner, setNewShowBanner] = useState(true);

  // ==========================================
  // HANDLERS: QUẢNG CÁO
  // ==========================================
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAdImage(true);
    setAdMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadAdImage(formData);
      if (res.success && res.url) {
        setAdConfig((prev) => ({ ...prev, imageUrl: res.url! }));
        setAdMessage({ type: 'success', text: 'Tải ảnh lên thành công!' });
      } else {
        setAdMessage({ type: 'error', text: res.error || 'Lỗi khi tải ảnh.' });
      }
    } catch {
      setAdMessage({ type: 'error', text: 'Không thể kết nối máy chủ.' });
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleSaveAdConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAd(true);
    setAdMessage(null);

    try {
      const res = await saveLoginAdConfig(adConfig);
      if (res.success && res.config) {
        setAdConfig(res.config);
        setAdMessage({
          type: 'success',
          text: 'Đã lưu cấu hình quảng cáo thành công!',
        });
      } else {
        setAdMessage({ type: 'error', text: res.error || 'Lỗi lưu cấu hình.' });
      }
    } catch {
      setAdMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cấu hình.' });
    } finally {
      setIsSavingAd(false);
    }
  };

  const startPreview = () => {
    if (!adConfig.imageUrl) {
      alert('Vui lòng thêm link ảnh hoặc tải ảnh lên để xem trước.');
      return;
    }
    setPreviewOpen(true);
    const secs = adConfig.countdownSeconds || 5;
    setPreviewCountdown(secs);
    setPreviewCanClose(false);

    let current = secs;
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    previewTimerRef.current = setInterval(() => {
      current -= 1;
      setPreviewCountdown(current);
      if (current <= 0) {
        setPreviewCanClose(true);
        if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      }
    }, 1000);
  };

  const closePreview = () => {
    if (!previewCanClose) return;
    setPreviewOpen(false);
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
  };

  // ==========================================
  // HANDLERS: THÔNG BÁO TÍNH NĂNG
  // ==========================================
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setAnnounceMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung.' });
      return;
    }

    setIsCreatingAnnounce(true);
    setAnnounceMsg(null);

    try {
      const res = await createAnnouncement({
        title: newTitle,
        content: newContent,
        type: newType,
        badge: newBadge || undefined,
        linkUrl: newLinkUrl || undefined,
        linkText: newLinkText || undefined,
        isActive: newIsActive,
        showBanner: newShowBanner,
      });

      if (res.success && res.item) {
        setAnnouncements((prev) => [res.item!, ...prev]);
        setAnnounceMsg({ type: 'success', text: 'Đã tạo thông báo tính năng thành công!' });
        // Reset form
        setNewTitle('');
        setNewContent('');
        setNewBadge('');
        setNewLinkUrl('');
        setNewLinkText('Xem ngay');
      } else {
        setAnnounceMsg({ type: 'error', text: res.error || 'Lỗi khi tạo thông báo.' });
      }
    } catch {
      setAnnounceMsg({ type: 'error', text: 'Có lỗi xảy ra.' });
    } finally {
      setIsCreatingAnnounce(false);
    }
  };

  const handleToggle = (id: string, field: 'isActive' | 'showBanner') => {
    startTransition(async () => {
      const res = await toggleAnnouncementState(id, field);
      if (res.success && res.newValue !== undefined) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === id ? { ...item, [field]: res.newValue! } : item)),
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;
    startTransition(async () => {
      const res = await deleteAnnouncement(id);
      if (res.success) {
        setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      }
    });
  };

  const setSampleData = (sampleType: 'NEW_PRODUCT' | 'VOUCHER') => {
    if (sampleType === 'NEW_PRODUCT') {
      setNewType('NEW_PRODUCT');
      setNewBadge('Sản phẩm mới');
      setNewTitle('Khóa học Next.js 15 Fullstack & DevOps Production');
      setNewContent('Học thực chiến xây dựng hệ thống chịu tải cao, Docker & VPS deploy.');
      setNewLinkUrl('/courses');
      setNewLinkText('Xem khóa học');
    } else {
      setNewType('VOUCHER');
      setNewBadge('Voucher 30%');
      setNewTitle('Mã giảm giá HELLO2026');
      setNewContent('Giảm ngay 30% cho tất cả đơn hàng trên Shop khi thanh toán hôm nay.');
      setNewLinkUrl('/shop');
      setNewLinkText('Dùng mã ngay');
    }
  };

  return (
    <div className="space-y-8">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary rounded-xl p-2">
              <Settings className="size-6" />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Cài đặt hệ thống
              </h1>
              <p className="text-muted-foreground text-sm">
                Quản lý banner quảng cáo đăng nhập đếm ngược 5s và các thông báo tính năng, voucher
                hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="bg-muted/60 border-border flex items-center rounded-xl border p-1">
          <button
            type="button"
            onClick={() => setActiveTab('ad')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'ad'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="size-4 text-amber-500" />
            <span>Popup quảng cáo (5s)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'announcements'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="size-4 text-blue-500" />
            <span>Thông báo tính năng / Voucher</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CÀI ĐẶT POPUP QUẢNG CÁO (5s Countdown)                             */}
      {/* ========================================================================= */}
      {activeTab === 'ad' && (
        <div className="space-y-6">
          {adMessage && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
                adMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {adMessage.type === 'success' ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : (
                <AlertCircle className="size-5 shrink-0" />
              )}
              <p>{adMessage.text}</p>
            </div>
          )}

          <form onSubmit={handleSaveAdConfig} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Cột trái: Form cấu hình */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card Bật/Tắt */}
              <div className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-foreground text-base font-semibold">
                      Trạng thái quảng cáo
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      Bật để hiển thị modal quảng cáo khi người dùng đăng nhập vào hệ thống
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={adConfig.enabled}
                      onChange={(e) =>
                        setAdConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      className="peer sr-only"
                    />
                    <div className="bg-muted peer after:border-border peer-checked:bg-primary h-6 w-11 rounded-full peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              </div>

              {/* Card Cấu hình hình ảnh & Nội dung */}
              <div className="border-border bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
                <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                  <ImageIcon className="text-primary size-4" />
                  Hình ảnh & Nội dung quảng cáo
                </h2>

                {/* Upload hoặc Link ảnh */}
                <div className="space-y-3">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Hình ảnh quảng cáo *
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        placeholder="https://example.com/banner-qc.png hoặc tải ảnh bên dưới"
                        value={adConfig.imageUrl}
                        onChange={(e) =>
                          setAdConfig((prev) => ({ ...prev, imageUrl: e.target.value }))
                        }
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <label className="bg-muted/80 hover:bg-muted text-foreground border-border inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors">
                      {isUploadingAdImage ? (
                        <Loader2 className="text-primary size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      <span>{isUploadingAdImage ? 'Đang tải...' : 'Tải từ máy tính'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImage}
                        disabled={isUploadingAdImage}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Hỗ trợ định dạng: PNG, JPG, WebP, GIF. Kích thước gợi ý: tỉ lệ 4:5 hoặc 1:1, tối
                    đa 8MB.
                  </p>
                </div>

                {/* Tiêu đề quảng cáo */}
                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Tiêu đề thông điệp (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Siêu khuyến mãi tháng này - Nhận ngay ưu đãi 50%"
                    value={adConfig.title}
                    onChange={(e) => setAdConfig((prev) => ({ ...prev, title: e.target.value }))}
                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Link điều hướng */}
                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Đường dẫn khi click vào ảnh (URL chuyển hướng)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="VD: /shop, /courses hoặc https://shopee.vn/..."
                      value={adConfig.linkUrl}
                      onChange={(e) =>
                        setAdConfig((prev) => ({ ...prev, linkUrl: e.target.value }))
                      }
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/40 w-full rounded-xl border py-2.5 pr-10 pl-3.5 text-sm focus:ring-2 focus:outline-none"
                    />
                    <ExternalLink className="text-muted-foreground pointer-events-none absolute top-3 right-3.5 size-4" />
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Nếu điền link, khi khách nhấn vào ảnh hoặc nút chi tiết sẽ chuyển tới link này.
                  </p>
                </div>
              </div>

              {/* Card Quy tắc hiển thị & Đếm ngược 5s */}
              <div className="border-border bg-card space-y-5 rounded-2xl border p-6 shadow-sm">
                <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                  <Clock className="size-4 text-amber-500" />
                  Thời gian đếm ngược & Đối tượng
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Số giây chờ tắt */}
                  <div className="space-y-1.5">
                    <label className="text-foreground block text-xs font-semibold">
                      Số giây đếm ngược hiện nút X (Mặc định: 5s)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={adConfig.countdownSeconds}
                        onChange={(e) =>
                          setAdConfig((prev) => ({
                            ...prev,
                            countdownSeconds: Number(e.target.value) || 5,
                          }))
                        }
                        className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                      />
                      <span className="text-muted-foreground shrink-0 text-xs font-medium">
                        giây
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Trong khoảng thời gian này, người dùng chưa thể bấm X để tắt quảng cáo.
                    </p>
                  </div>

                  {/* Đối tượng áp dụng */}
                  <div className="space-y-1.5">
                    <label className="text-foreground block text-xs font-semibold">
                      Đối tượng nhìn thấy
                    </label>
                    <select
                      value={adConfig.targetAudience}
                      onChange={(e) =>
                        setAdConfig((prev) => ({
                          ...prev,
                          targetAudience: e.target.value as 'authenticated' | 'all',
                        }))
                      }
                      className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                    >
                      <option value="authenticated">Người dùng đã đăng nhập (Khuyên dùng)</option>
                      <option value="all">Tất cả khách truy cập website</option>
                    </select>
                    <p className="text-muted-foreground text-[11px]">
                      &quot;Người dùng đã đăng nhập&quot; sẽ hiện khi thành viên login vào web.
                    </p>
                  </div>
                </div>

                {/* Tần suất hiển thị */}
                <div className="space-y-1.5">
                  <label className="text-foreground block text-xs font-semibold">
                    Tần suất hiển thị lặp lại
                  </label>
                  <select
                    value={adConfig.frequency}
                    onChange={(e) =>
                      setAdConfig((prev) => ({
                        ...prev,
                        frequency: e.target.value as
                          'once_per_session' | 'every_login' | 'once_per_day',
                      }))
                    }
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  >
                    <option value="once_per_session">
                      1 lần trong mỗi phiên duyệt web (Khuyên dùng)
                    </option>
                    <option value="once_per_day">1 lần mỗi 24 giờ</option>
                    <option value="every_login">Mỗi lần đăng nhập mới</option>
                  </select>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingAd}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSavingAd ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>{isSavingAd ? 'Đang lưu cài đặt...' : 'Lưu cài đặt quảng cáo'}</span>
                </button>

                <button
                  type="button"
                  onClick={startPreview}
                  className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
                >
                  <Eye className="text-primary size-4" />
                  <span>Xem thử Popup (5s đếm ngược)</span>
                </button>
              </div>
            </div>

            {/* Cột phải: Preview Mockup */}
            <div className="space-y-4 lg:col-span-5">
              <div className="border-border bg-card sticky top-20 space-y-4 rounded-2xl border p-6 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-foreground text-sm font-semibold">
                    Xem trước giao diện Banner
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      adConfig.enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {adConfig.enabled ? 'Đang bật' : 'Đang tắt'}
                  </span>
                </div>

                {adConfig.imageUrl ? (
                  <div className="border-border/80 bg-background group relative overflow-hidden rounded-xl border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={adConfig.imageUrl}
                      alt={adConfig.title || 'Quảng cáo xem trước'}
                      className="max-h-72 w-full bg-black/5 object-contain"
                    />
                    <div className="bg-card border-border border-t p-3">
                      <p className="text-foreground truncate text-xs font-semibold">
                        {adConfig.title || 'Chưa đặt tiêu đề'}
                      </p>
                      {adConfig.linkUrl && (
                        <p className="text-muted-foreground truncate text-[11px]">
                          Đích đến: {adConfig.linkUrl}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-border/80 bg-muted/20 text-muted-foreground flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center">
                    <ImageIcon className="mb-2 size-10 opacity-40" />
                    <p className="text-xs font-medium">Chưa có ảnh quảng cáo</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Tải ảnh lên hoặc nhập link ảnh để hiển thị ở đây
                    </p>
                  </div>
                )}

                <div className="bg-muted/40 text-muted-foreground border-border/50 space-y-1.5 rounded-xl border p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Thời gian chờ tắt:</span>
                    <strong className="text-foreground">{adConfig.countdownSeconds} giây</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Đối tượng:</span>
                    <span className="text-foreground">
                      {adConfig.targetAudience === 'authenticated' ? 'Đã đăng nhập' : 'Tất cả'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THÔNG BÁO TÍNH NĂNG & KHUYẾN MÃI (Sản phẩm mới, Voucher...)       */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-8">
          {announceMsg && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
                announceMsg.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {announceMsg.type === 'success' ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : (
                <AlertCircle className="size-5 shrink-0" />
              )}
              <p>{announceMsg.text}</p>
            </div>
          )}

          {/* Form thêm thông báo mới */}
          <div className="border-border bg-card space-y-6 rounded-2xl border p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
                  <Plus className="text-primary size-4" />
                  Tạo thông báo tính năng mới
                </h2>
                <p className="text-muted-foreground text-xs">
                  Gửi thông báo tính năng hệ thống như Sản phẩm mới trên Shop, Voucher khuyến mãi,
                  Cập nhật tính năng...
                </p>
              </div>

              {/* Nút điền nhanh mẫu */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => setSampleData('NEW_PRODUCT')}
                  className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  + Sản phẩm mới
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData('VOUCHER')}
                  className="bg-muted text-foreground hover:bg-muted/80 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  + Voucher giảm giá
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Loại thông báo */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Loại thông báo *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AnnouncementType)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  >
                    <option value="NEW_PRODUCT">🛍️ Sản phẩm mới</option>
                    <option value="VOUCHER">🎟️ Ưu đãi Voucher</option>
                    <option value="FEATURE">🚀 Tính năng mới</option>
                    <option value="MAINTENANCE">⚙️ Bảo trì / Cảnh báo</option>
                    <option value="GENERAL">📢 Thông báo chung</option>
                  </select>
                </div>

                {/* Nhãn Badge */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Nhãn Badge (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Mới ra mắt, HOT 50%..."
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Tiêu đề */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Tiêu đề ngắn *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Ra mắt bộ mã nguồn E-commerce..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Nội dung thông báo */}
              <div className="space-y-1.5">
                <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                  Nội dung chi tiết thông báo *
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập nội dung ngắn gọn tóm tắt về sản phẩm mới hoặc mã voucher khuyến mãi..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Link URL */}
                <div className="space-y-1.5 sm:col-span-8">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Đường dẫn liên kết (Link đích khi bấm)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /shop, /courses hoặc /vouchers"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Link Text */}
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-foreground block text-xs font-semibold tracking-wider uppercase">
                    Chữ trên nút bấm
                  </label>
                  <input
                    type="text"
                    placeholder="Xem ngay / Khám phá ngay"
                    value={newLinkText}
                    onChange={(e) => setNewLinkText(e.target.value)}
                    className="border-input bg-background text-foreground focus:ring-primary/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tùy chọn hiển thị */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="border-input text-primary focus:ring-primary rounded"
                  />
                  <span>Kích hoạt ngay (Active)</span>
                </label>

                <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={newShowBanner}
                    onChange={(e) => setNewShowBanner(e.target.checked)}
                    className="border-input text-primary focus:ring-primary rounded"
                  />
                  <span>Ghim hiển thị lên thanh Top Banner đầu trang</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingAnnounce}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isCreatingAnnounce ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span>{isCreatingAnnounce ? 'Đang tạo...' : 'Tạo thông báo'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Danh sách thông báo */}
          <div className="border-border bg-card space-y-4 rounded-2xl border p-6 shadow-sm">
            <h2 className="text-foreground flex items-center justify-between text-base font-semibold">
              <span>Danh sách thông báo hệ thống ({announcements.length})</span>
            </h2>

            {announcements.length === 0 ? (
              <div className="border-border/80 rounded-xl border border-dashed py-10 text-center">
                <Radio className="text-muted-foreground mx-auto mb-2 size-8 opacity-40" />
                <p className="text-muted-foreground text-sm font-medium">Chưa có thông báo nào.</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Dùng form bên trên hoặc bấm &quot;Mẫu nhanh&quot; để tạo thông báo đầu tiên.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="border-border/70 bg-background/50 hover:border-border flex flex-col justify-between gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            item.type === 'NEW_PRODUCT'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : item.type === 'VOUCHER'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {item.type === 'NEW_PRODUCT' && <Package className="size-3" />}
                          {item.type === 'VOUCHER' && <Tag className="size-3" />}
                          {item.type === 'FEATURE' && <Rocket className="size-3" />}
                          {item.type === 'MAINTENANCE' && <Info className="size-3" />}
                          <span>{item.badge || item.type}</span>
                        </span>

                        <h3 className="text-foreground truncate text-sm font-semibold">
                          {item.title}
                        </h3>

                        {item.showBanner && (
                          <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                            Ghim Top Banner
                          </span>
                        )}
                      </div>

                      <p className="text-muted-foreground line-clamp-2 text-xs">{item.content}</p>

                      {item.linkUrl && (
                        <div className="text-primary flex items-center gap-1 text-[11px]">
                          <ExternalLink className="size-3" />
                          <Link href={item.linkUrl} target="_blank" className="hover:underline">
                            {item.linkUrl} ({item.linkText || 'Xem ngay'})
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Toggles & Nút xóa */}
                    <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'isActive')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          item.isActive
                            ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Bật/Tắt kích hoạt"
                      >
                        {item.isActive ? 'Đang bật' : 'Đang ẩn'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'showBanner')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          item.showBanner
                            ? 'bg-primary/15 text-primary hover:bg-primary/25'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Bật/Tắt ghim banner đầu trang"
                      >
                        {item.showBanner ? 'Banner: Bật' : 'Banner: Tắt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-1.5 transition-colors"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PREVIEW QUẢNG CÁO (5s Countdown)                                    */}
      {/* ========================================================================= */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && previewCanClose) {
              closePreview();
            }
          }}
        >
          <div className="animate-in zoom-in-95 relative w-full max-w-xl duration-200">
            <div className="bg-card border-border/80 relative overflow-hidden rounded-2xl border shadow-2xl">
              {/* Nút đếm ngược hoặc Nút tắt X */}
              <div className="absolute top-3 right-3 z-30">
                {!previewCanClose ? (
                  <div className="flex animate-pulse items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md select-none">
                    <span className="inline-block size-2 rounded-full bg-amber-400" />
                    <span>Đóng sau {previewCountdown}s</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={closePreview}
                    aria-label="Đóng xem trước"
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/30 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105 hover:bg-black active:scale-95"
                  >
                    <span>Bỏ qua</span>
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Badge nhãn */}
              <div className="absolute top-3 left-3 z-20">
                <span className="bg-primary/90 text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow backdrop-blur-md">
                  <Sparkles className="size-3" />
                  Chế độ Xem trước
                </span>
              </div>

              {/* Ảnh quảng cáo */}
              <div className="relative overflow-hidden bg-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={adConfig.imageUrl}
                  alt={adConfig.title || 'Quảng cáo'}
                  className="max-h-[70vh] w-full object-contain sm:max-h-[500px] sm:object-cover"
                />
              </div>

              {/* Chân mô tả */}
              {(adConfig.title || adConfig.linkUrl) && (
                <div className="bg-background/95 border-border flex flex-col items-center justify-between gap-3 border-t p-4 backdrop-blur-sm sm:flex-row">
                  <div className="text-center sm:text-left">
                    <h3 className="text-foreground line-clamp-1 text-sm font-semibold">
                      {adConfig.title || 'Ưu đãi đặc biệt'}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Bấm vào ảnh để chuyển hướng tới trang đích
                    </p>
                  </div>
                  {adConfig.linkUrl && (
                    <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm">
                      <span>Xem chi tiết</span>
                      <ExternalLink className="size-3.5" />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
