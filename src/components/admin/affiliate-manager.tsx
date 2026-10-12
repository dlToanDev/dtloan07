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

  const handleClearShortenedUrl = () => {
    setShortenedUrl('');
    setActiveUrlType('DIRECT');
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

    const trimmedShortUrl = shortenedUrl.trim();
    const finalActiveType: AffiliateLinkType =
      activeUrlType === 'SHORTENED' && !trimmedShortUrl ? 'DIRECT' : activeUrlType;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('perks', perks);
    formData.append('couponCode', couponCode);
    formData.append('directUrl', directUrl);
    formData.append('shortenedUrl', trimmedShortUrl);
    formData.append('activeUrlType', finalActiveType);
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
            <MousePointerClick className="text-info size-4" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalClicks}</div>
          <p className="text-muted-foreground mt-1 text-xs">Đo lường qua /go/[slug]</p>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium uppercase">
              Đang kiếm tiền Shortlink
            </span>
            <DollarSign className="text-success size-4" />
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
                              <span className="text-success font-medium">• {item.perks}</span>
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
                            className="text-primary inline-flex items-center gap-0.5 truncate hover:underline"
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
                              className="text-success inline-flex items-center gap-0.5 truncate font-medium hover:underline"
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
                            ? 'border-success/30 bg-success/15 text-success border'
                            : 'border-primary/30 bg-primary/15 text-primary border'
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
                            ? 'border-warning/30 bg-warning/10 text-warning font-semibold'
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
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
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
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 p-0"
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
              <Zap className="text-warning size-4" /> Cấu hình 2 Nguồn Link Kiếm Tiền
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
                      <Sparkles className="text-warning size-3.5" /> Rút gọn kiếm tiền
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
                    ? 'border-success/20 bg-success/10 text-success border'
                    : 'border-warning/20 bg-warning/10 text-warning border'
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
              <div className="flex items-center justify-between text-xs font-medium">
                <label className="text-foreground">2. Link Rút Gọn Kiếm Tiền (Tùy chọn)</label>
                {shortenedUrl && (
                  <button
                    type="button"
                    onClick={handleClearShortenedUrl}
                    className="text-destructive hover:text-destructive flex items-center gap-1 text-[11px] font-medium hover:underline"
                  >
                    <Trash2 className="size-3" /> Xóa link rút gọn
                  </button>
                )}
              </div>
              <Input
                value={shortenedUrl}
                onChange={(e) => setShortenedUrl(e.target.value)}
                placeholder="https://megaurl.in/... (Để trống nếu chỉ muốn dùng link gốc)"
                className="text-success mt-1 font-mono text-sm"
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                {shortenedUrl
                  ? 'Đã có link rút gọn. Bạn có thể chọn Chế độ link bên dưới hoặc bấm Xóa nếu không muốn dùng.'
                  : 'Không bắt buộc. Nếu bạn không muốn rút gọn thì để trống mục này và chọn Link trực tiếp.'}
              </p>
            </div>

            {/* Chọn loại link kích hoạt */}
            <div className="border-border/70 space-y-2 border-t pt-2">
              <span className="text-xs font-semibold">Chế độ link áp dụng khi khách bấm xem:</span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition ${
                    activeUrlType === 'DIRECT'
                      ? 'border-primary bg-primary/10 text-foreground ring-primary shadow-xs ring-1'
                      : 'border-border/70 bg-card/60 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="activeUrlType"
                    value="DIRECT"
                    checked={activeUrlType === 'DIRECT'}
                    onChange={() => setActiveUrlType('DIRECT')}
                    className="mt-1"
                  />
                  <div className="space-y-0.5">
                    <div className="text-foreground flex items-center gap-1 text-xs font-semibold">
                      <Zap className="text-primary size-3" />
                      <span>Link trực tiếp (Không qua rút gọn)</span>
                    </div>
                    <p className="text-muted-foreground text-[10px] leading-tight">
                      Khách mở thẳng website gốc. Không quảng cáo, trải nghiệm tốt nhất.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 rounded-xl border transition ${
                    !shortenedUrl
                      ? 'border-border cursor-not-allowed border-dashed opacity-50'
                      : activeUrlType === 'SHORTENED'
                        ? 'border-success bg-success/10 text-foreground ring-success cursor-pointer shadow-xs ring-1'
                        : 'border-border/70 bg-card/60 hover:bg-muted/50 text-muted-foreground cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="activeUrlType"
                    value="SHORTENED"
                    disabled={!shortenedUrl}
                    checked={activeUrlType === 'SHORTENED'}
                    onChange={() => setActiveUrlType('SHORTENED')}
                    className="mt-1"
                  />
                  <div className="space-y-0.5">
                    <div className="text-foreground flex items-center gap-1 text-xs font-semibold">
                      <DollarSign className="text-success size-3" />
                      <span>Link rút gọn kiếm tiền ($$$)</span>
                    </div>
                    <p className="text-muted-foreground text-[10px] leading-tight">
                      {shortenedUrl
                        ? 'Khách đi qua link rút gọn quảng cáo để bạn kiếm thêm tiền từ click.'
                        : 'Chưa có link rút gọn. Bấm nút "Rút gọn kiếm tiền" ở trên nếu muốn dùng.'}
                    </p>
                  </div>
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
