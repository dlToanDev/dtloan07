'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  createAffiliateItem,
  updateAffiliateItem,
  deleteAffiliateItem,
  toggleAffiliateStatus,
  toggleAffiliateFeatured,
  setAffiliateActiveLinkType,
  generateShortUrlAction,
} from '@/server/actions/affiliate';
import { AffiliateCategory, AffiliateItem, AffiliateLinkType } from '@prisma/client';
import {
  ExternalLink,
  Plus,
  Zap,
  Sparkles,
  MousePointerClick,
  DollarSign,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AffiliateManagerProps {
  initialItems: AffiliateItem[];
}

const CATEGORIES: { label: string; value: AffiliateCategory }[] = [
  { label: 'VPS & Cloud', value: 'CLOUD' },
  { label: 'Tên miền & DNS', value: 'DOMAIN' },
  { label: 'DevOps & Tooling', value: 'DEVOPS' },
  { label: 'Công cụ Dev & AI', value: 'DEVTOOLS' },
  { label: 'Bảo mật & VPN', value: 'SECURITY' },
  { label: 'Mua sắm & Thiết bị', value: 'SHOPPING' },
  { label: 'Khác', value: 'OTHER' },
];

export function AffiliateManager({ initialItems }: AffiliateManagerProps) {
  const [items, setItems] = useState<AffiliateItem[]>(initialItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AffiliateItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<AffiliateCategory>('CLOUD');
  const [description, setDescription] = useState('');
  const [perks, setPerks] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState('');
  const [activeUrlType, setActiveUrlType] = useState<AffiliateLinkType>('DIRECT');
  const [logoUrl, setLogoUrl] = useState('');
  const [featured, setFeatured] = useState(false);

  // Shortening loading state
  const [isShortening, setIsShortening] = useState(false);
  const [shortenMessage, setShortenMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form
  const resetForm = () => {
    setName('');
    setSlug('');
    setCategory('CLOUD');
    setDescription('');
    setPerks('');
    setCouponCode('');
    setDirectUrl('');
    setShortenedUrl('');
    setActiveUrlType('DIRECT');
    setLogoUrl('');
    setFeatured(false);
    setShortenMessage(null);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (item: AffiliateItem) => {
    setEditingItem(item);
    setName(item.name);
    setSlug(item.slug);
    setCategory(item.category);
    setDescription(item.description);
    setPerks(item.perks || '');
    setCouponCode(item.couponCode || '');
    setDirectUrl(item.directUrl);
    setShortenedUrl(item.shortenedUrl || '');
    setActiveUrlType(item.activeUrlType);
    setLogoUrl(item.logoUrl || '');
    setFeatured(item.featured);
    setShortenMessage(null);
  };

  // Tự động gọi API rút gọn link kiếm tiền
  const handleGenerateShortUrl = async () => {
    if (!directUrl || !directUrl.startsWith('http')) {
      setShortenMessage({
        type: 'error',
        text: 'Vui lòng dán Link Affiliate trực tiếp hợp lệ trước.',
      });
      return;
    }

    setIsShortening(true);
    setShortenMessage(null);

    try {
      const res = await generateShortUrlAction(directUrl);
      if (res.success && res.shortenedUrl) {
        setShortenedUrl(res.shortenedUrl);
        setActiveUrlType('SHORTENED'); // Mặc định chuyển sang link kiếm tiền
        setShortenMessage({ type: 'success', text: 'Đã tạo link rút gọn kiếm tiền thành công!' });
      } else {
        setShortenMessage({
          type: 'error',
          text: res.error || 'Không thể tạo link rút gọn. Bạn có thể tự dán link thủ công.',
        });
      }
    } catch {
      setShortenMessage({ type: 'error', text: 'Lỗi khi gọi máy chủ rút gọn link.' });
    } finally {
      setIsShortening(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('perks', perks);
    formData.append('couponCode', couponCode);
    formData.append('directUrl', directUrl);
    formData.append('shortenedUrl', shortenedUrl);
    formData.append('activeUrlType', activeUrlType);
    formData.append('logoUrl', logoUrl);
    formData.append('featured', featured ? 'true' : 'false');

    try {
      if (editingItem) {
        await updateAffiliateItem(editingItem.id, formData);
        setEditingItem(null);
      } else {
        await createAffiliateItem(formData);
        setIsCreateOpen(false);
      }
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa deal "${itemName}"?`)) return;
    await deleteAffiliateItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggleStatus = async (item: AffiliateItem) => {
    await toggleAffiliateStatus(item.id, item.active);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: !item.active } : i)));
  };

  const handleToggleFeatured = async (item: AffiliateItem) => {
    await toggleAffiliateFeatured(item.id, item.featured);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, featured: !item.featured } : i)),
    );
  };

  const handleSwitchLinkType = async (item: AffiliateItem) => {
    const nextType: AffiliateLinkType = item.activeUrlType === 'DIRECT' ? 'SHORTENED' : 'DIRECT';
    if (nextType === 'SHORTENED' && (!item.shortenedUrl || item.shortenedUrl.trim() === '')) {
      alert('Deal này chưa có Link rút gọn kiếm tiền. Vui lòng bấm Sửa để tạo link trước.');
      return;
    }
    await setAffiliateActiveLinkType(item.id, nextType);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activeUrlType: nextType } : i)));
  };

  // Thống kê nhanh
  const totalClicks = items.reduce((acc, curr) => acc + curr.clickCount, 0);
  const totalMonetized = items.filter((i) => i.activeUrlType === 'SHORTENED').length;

  return (
    <div className="space-y-6">
      {/* Thống kê doanh thu & click */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              Tổng số Deals
            </span>
            <Sparkles className="text-primary size-4" />
          </div>
          <div className="mt-2 text-2xl font-bold">{items.length}</div>
          <p className="text-muted-foreground mt-1 text-xs">
            {items.filter((i) => i.active).length} đang hoạt động
          </p>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              Tổng lượt click
            </span>
            <MousePointerClick className="size-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalClicks}</div>
          <p className="text-muted-foreground mt-1 text-xs">Đo lường qua /go/[slug]</p>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              Đang kiếm tiền Shortlink
            </span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">
            {totalMonetized} / {items.length}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Đang áp dụng link rút gọn</p>
        </div>

        <div className="bg-card border-border flex flex-col justify-center rounded-xl border p-4 shadow-sm">
          <Button onClick={openCreate} className="w-full gap-2">
            <Plus className="size-4" /> Thêm Deal Mới
          </Button>
        </div>
      </div>

      {/* Bảng danh sách Deals */}
      <div className="bg-card border-border rounded-xl border shadow-sm">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-semibold">Quản lý 2 Nguồn Link Affiliate</h3>
            <p className="text-muted-foreground text-xs">
              Đường 1: Link trực tiếp | Đường 2: Link rút gọn kiếm tiền (MegaURL / Ouo / Shortener)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3">Dịch vụ & Logo</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">2 Đường Link</th>
                <th className="px-4 py-3 text-center">Chế độ đang chạy</th>
                <th className="px-4 py-3 text-center">Lượt Click</th>
                <th className="px-4 py-3 text-center">Ghim Home</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted-foreground py-10 text-center">
                    Chưa có liên kết nào. Hãy bấm &quot;Thêm Deal Mới&quot; để bắt đầu.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.logoUrl}
                            alt=""
                            className="border-border bg-background size-8 shrink-0 rounded-md border object-contain p-1"
                          />
                        ) : (
                          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-foreground font-medium">{item.name}</div>
                          <div className="text-muted-foreground flex items-center gap-1 text-xs">
                            <span>/go/{item.slug}</span>
                            {item.perks && (
                              <span className="font-medium text-emerald-500">• {item.perks}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                      </Badge>
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      <div className="space-y-1 text-xs">
                        <div className="text-muted-foreground flex items-center gap-1 truncate">
                          <span className="text-foreground font-semibold">1. Trực tiếp:</span>
                          <a
                            href={item.directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 truncate text-blue-500 hover:underline"
                          >
                            {item.directUrl} <ExternalLink className="size-3" />
                          </a>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 truncate">
                          <span className="text-foreground font-semibold">2. Kiếm tiền:</span>
                          {item.shortenedUrl ? (
                            <a
                              href={item.shortenedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 truncate font-medium text-emerald-500 hover:underline"
                            >
                              {item.shortenedUrl} <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 italic">(Chưa tạo)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSwitchLinkType(item)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          item.activeUrlType === 'SHORTENED'
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                        title="Bấm để chuyển đổi nhanh giữa Link trực tiếp và Link rút gọn kiếm tiền"
                      >
                        {item.activeUrlType === 'SHORTENED' ? (
                          <>
                            <DollarSign className="size-3" /> Link Kiếm Tiền
                          </>
                        ) : (
                          <>
                            <Zap className="size-3" /> Link Trực Tiếp
                          </>
                        )}
                      </button>
                    </td>

                    <td className="text-foreground px-4 py-3 text-center font-bold">
                      {item.clickCount}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(item)}
                        className={`rounded border px-2 py-0.5 text-xs transition ${
                          item.featured
                            ? 'border-amber-500/30 bg-amber-500/10 font-semibold text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {item.featured ? '★ Ghim' : '☆ Ẩn'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`rounded border px-2 py-0.5 text-xs transition ${
                          item.active
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.active ? 'Bật' : 'Tắt'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="size-8 p-0"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="size-8 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm Mới / Chỉnh Sửa Deal */}
      <Dialog
        open={isCreateOpen || editingItem !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? `Chỉnh sửa: ${editingItem.name}` : 'Thêm Deal Affiliate Mới'}
        description="Điền thông tin và quản lý 2 nguồn link (Link trực tiếp & Rút gọn kiếm tiền)"
        className="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Tên dịch vụ / Công cụ *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Hetzner Cloud"
                required
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AffiliateCategory)}
                className="border-border bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Slug đường dẫn (/go/[slug])</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="hetzner-cloud (tự sinh nếu để trống)"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Logo URL hoặc Icon</label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... (tuỳ chọn)"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Ưu đãi nổi bật (Perks)</label>
              <Input
                value={perks}
                onChange={(e) => setPerks(e.target.value)}
                placeholder="VD: Tặng €20 Cloud Credits"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Mã Coupon giảm giá (nếu có)</label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="VD: SAVE50"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">Mô tả ngắn / Đánh giá kinh nghiệm</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Chia sẻ lý do vì sao bạn khuyên dùng công cụ này..."
              className="border-border bg-background mt-1 w-full rounded-md border p-2 text-sm"
            />
          </div>

          {/* KHU VỰC 2 ĐƯỜNG LINK QUAN TRỌNG */}
          <div className="border-border bg-muted/40 space-y-3 rounded-xl border p-4">
            <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
              <Zap className="size-4 text-amber-500" /> Cấu hình 2 Nguồn Link Kiếm Tiền
            </h4>

            {/* Đường 1 */}
            <div>
              <label className="text-foreground flex items-center justify-between text-xs font-medium">
                <span>1. Link Affiliate Trực Tiếp (Bạn dán vào) *</span>
                <span className="text-muted-foreground text-[11px]">
                  (Shopee, DO, Hetzner, Accesstrade...)
                </span>
              </label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://hetzner.cloud/?ref=..."
                  required
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={handleGenerateShortUrl}
                  disabled={isShortening || !directUrl}
                  variant="outline"
                  className="bg-card shrink-0 gap-1.5 text-xs"
                  title="Gọi API rút gọn link kiếm tiền"
                >
                  {isShortening ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Đang tạo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 text-amber-500" /> Rút gọn kiếm tiền
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Thông báo tạo link */}
            {shortenMessage && (
              <div
                className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                  shortenMessage.type === 'success'
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {shortenMessage.type === 'success' ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span>{shortenMessage.text}</span>
              </div>
            )}

            {/* Đường 2 */}
            <div>
              <label className="text-foreground flex items-center justify-between text-xs font-medium">
                <span>2. Link Rút Gọn Kiếm Tiền (Tự sinh từ nút trên hoặc dán tay)</span>
                <span className="text-muted-foreground text-[11px]">
                  (MegaURL, Ouo.io, Shorte.st...)
                </span>
              </label>
              <Input
                value={shortenedUrl}
                onChange={(e) => setShortenedUrl(e.target.value)}
                placeholder="https://megaurl.in/..."
                className="mt-1 font-mono text-sm text-emerald-600 dark:text-emerald-400"
              />
            </div>

            {/* Chọn loại link kích hoạt */}
            <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
              <span className="text-xs font-semibold">Loại link phát hành cho độc giả:</span>
              <div className="flex items-center gap-4 text-xs font-medium">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="activeUrlType"
                    value="DIRECT"
                    checked={activeUrlType === 'DIRECT'}
                    onChange={() => setActiveUrlType('DIRECT')}
                  />
                  <span>Link trực tiếp</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <input
                    type="radio"
                    name="activeUrlType"
                    value="SHORTENED"
                    checked={activeUrlType === 'SHORTENED'}
                    onChange={() => setActiveUrlType('SHORTENED')}
                  />
                  <span>Link rút gọn kiếm tiền ($$$)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="featured"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="featured" className="cursor-pointer text-xs font-medium">
              Ghim lên mục &quot;Hot Deals khuyên dùng&quot; trên Trang Chủ
            </label>
          </div>

          <div className="border-border flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingItem(null);
              }}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                'Lưu Deal'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
