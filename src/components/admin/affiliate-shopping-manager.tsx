'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { AffiliateItem, AffiliateLinkType, AffiliateCategory } from '@prisma/client';
import {
  createAffiliateItem,
  updateAffiliateItem,
  deleteAffiliateItem,
  toggleAffiliateStatus,
  setAffiliateActiveLinkType,
  generateShortUrlAction,
  uploadAffiliateImage,
} from '@/server/actions/affiliate';
import {
  ShoppingBag,
  Plus,
  Zap,
  Sparkles,
  DollarSign,
  Trash2,
  Edit2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
} from 'lucide-react';

interface ShoppingAffiliateManagerProps {
  initialItems: AffiliateItem[];
  shortenerConfigured: boolean;
}

export function ShoppingAffiliateManager({
  initialItems,
  shortenerConfigured,
}: ShoppingAffiliateManagerProps) {
  const [items, setItems] = useState<AffiliateItem[]>(initialItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AffiliateItem | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<AffiliateCategory>('SHOPEE');
  const [platform, setPlatform] = useState('Shopee');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [perks, setPerks] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState('');
  const [activeUrlType, setActiveUrlType] = useState<AffiliateLinkType>('DIRECT');
  const [logoUrl, setLogoUrl] = useState('');
  const [featured, setFeatured] = useState(false);

  // Cấu hình tự động rút gọn khi dán link (mặc định tắt để tránh ép buộc người dùng, lưu vào localStorage)
  const [autoShortenOnPaste, setAutoShortenOnPaste] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('affiliate_auto_shorten');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const handleToggleAutoShorten = (checked: boolean) => {
    setAutoShortenOnPaste(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('affiliate_auto_shorten', String(checked));
    }
  };

  const handleClearShortenedUrl = () => {
    shortenRequestId.current += 1;
    setShortenedUrl('');
    setActiveUrlType('DIRECT');
    setShortenMessage(null);
    setIsShortening(false);
  };

  const [isShortening, setIsShortening] = useState(false);
  const [shortenMessage, setShortenMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shortenRequestId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetForm = () => {
    shortenRequestId.current += 1;
    setName('');
    setSlug('');
    setCategory('SHOPEE');
    setPlatform('Shopee');
    setSubCategory('');
    setDescription('');
    setPerks('');
    setCouponCode('');
    setDirectUrl('');
    setShortenedUrl('');
    setActiveUrlType('DIRECT');
    setLogoUrl('');
    setFeatured(false);
    setShortenMessage(null);
    setUploadError(null);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadAffiliateImage(fd);
      if (res.success && res.url) {
        setLogoUrl(res.url);
      } else {
        setUploadError(res.error || 'Lỗi tải ảnh lên.');
      }
    } catch {
      setUploadError('Không thể tải ảnh lên máy chủ.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
    setPlatform(item.platform || (item.category === 'TIKTOK' ? 'TikTok Shop' : 'Shopee'));
    setSubCategory(item.subCategory || '');
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

  const handleGenerateShortUrl = async (urlToShorten = directUrl) => {
    const normalizedUrl = urlToShorten.trim();
    if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
      setShortenMessage({ type: 'error', text: 'Vui lòng dán link Shopee/TikTok hợp lệ trước.' });
      return;
    }

    if (!shortenerConfigured) {
      setShortenMessage({
        type: 'error',
        text: 'Chưa cấu hình dịch vụ rút gọn. Hãy thêm SHORTENER_API_URL và SHORTENER_API_KEY vào file .env.',
      });
      return;
    }

    const requestId = ++shortenRequestId.current;
    setIsShortening(true);
    setShortenMessage(null);

    try {
      const res = await generateShortUrlAction(normalizedUrl);
      if (requestId !== shortenRequestId.current) return;
      if (res.success && res.shortenedUrl) {
        setShortenedUrl(res.shortenedUrl);
        setActiveUrlType('SHORTENED');
        setShortenMessage({ type: 'success', text: 'Đã tạo link rút gọn kiếm tiền thành công!' });
      } else {
        setShortenMessage({
          type: 'error',
          text: res.error || 'Không thể tạo tự động. Bạn có thể tự dán link rút gọn.',
        });
      }
    } catch {
      if (requestId !== shortenRequestId.current) return;
      setShortenMessage({ type: 'error', text: 'Lỗi khi gọi máy chủ rút gọn link.' });
    } finally {
      if (requestId === shortenRequestId.current) setIsShortening(false);
    }
  };

  const handleDirectUrlChange = (value: string) => {
    shortenRequestId.current += 1;
    setDirectUrl(value);
    setShortenedUrl('');
    setActiveUrlType('DIRECT');
    setShortenMessage(null);
    setIsShortening(false);
  };

  const handleDirectUrlPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedUrl = event.clipboardData.getData('text').trim();
    if (!/^https?:\/\//i.test(pastedUrl)) return;

    event.preventDefault();
    setDirectUrl(pastedUrl);
    setShortenMessage(null);

    if (autoShortenOnPaste && shortenerConfigured) {
      setShortenedUrl('');
      setActiveUrlType('DIRECT');
      void handleGenerateShortUrl(pastedUrl);
    } else {
      // Giữ nguyên Link trực tiếp, không ép gọi API rút gọn
      setActiveUrlType('DIRECT');
      setIsShortening(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    setIsSubmitting(true);

    const trimmedShortUrl = shortenedUrl.trim();
    const finalActiveType: AffiliateLinkType =
      activeUrlType === 'SHORTENED' && !trimmedShortUrl ? 'DIRECT' : activeUrlType;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('category', category);
    formData.append('platform', platform);
    formData.append('subCategory', subCategory);
    formData.append('description', description);
    formData.append('perks', perks);
    formData.append('couponCode', couponCode);
    formData.append('directUrl', directUrl);
    formData.append('shortenedUrl', trimmedShortUrl);
    formData.append('activeUrlType', finalActiveType);
    formData.append('logoUrl', logoUrl);
    formData.append('featured', featured ? 'true' : 'false');
    formData.append('active', publish ? 'true' : 'false');

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
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu sản phẩm affiliate.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${itemName}"?`)) return;
    await deleteAffiliateItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggle = async (item: AffiliateItem) => {
    await toggleAffiliateStatus(item.id, item.active);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: !item.active } : i)));
  };

  const handleSwitchLinkType = async (item: AffiliateItem) => {
    const nextType: AffiliateLinkType = item.activeUrlType === 'DIRECT' ? 'SHORTENED' : 'DIRECT';
    if (nextType === 'SHORTENED' && (!item.shortenedUrl || item.shortenedUrl.trim() === '')) {
      alert('Sản phẩm này chưa có Link rút gọn kiếm tiền. Vui lòng bấm Sửa để tạo link trước.');
      return;
    }
    await setAffiliateActiveLinkType(item.id, nextType);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activeUrlType: nextType } : i)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-foreground flex items-center gap-2 font-semibold">
            <ShoppingBag className="text-warning size-5" /> Quản lý Affiliate Shopee & TikTok Shop
          </h3>
          <p className="text-muted-foreground text-xs">
            Dán link affiliate sản phẩm từ Shopee, TikTok Shop, bàn phím, phụ kiện dev và tạo link
            rút gọn kiếm tiền.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Thêm Sản Phẩm Shopee/TikTok
        </Button>
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3">Sản phẩm & Nền tảng</th>
                <th className="px-4 py-3">2 Đường Link</th>
                <th className="px-4 py-3 text-center">Chế độ link</th>
                <th className="px-4 py-3 text-center">Lượt Click</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-10 text-center">
                    Chưa có sản phẩm Shopee/TikTok nào. Hãy bấm &quot;Thêm Sản Phẩm
                    Shopee/TikTok&quot; để dán link.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.logoUrl}
                            alt=""
                            className="border-border bg-background size-10 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="border-warning/30 bg-warning/10 text-warning flex size-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold">
                            {item.category === 'TIKTOK' ? 'TT' : 'SHP'}
                          </div>
                        )}
                        <div>
                          <div className="text-foreground font-medium">{item.name}</div>
                          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                              {item.platform ||
                                (item.category === 'TIKTOK' ? 'TikTok Shop' : 'Shopee')}
                            </Badge>
                            {item.subCategory && (
                              <span className="bg-muted text-foreground rounded px-1.5 py-0 text-[10px] font-medium">
                                {item.subCategory}
                              </span>
                            )}
                            {item.perks && (
                              <span className="text-success text-[11px] font-medium">
                                • {item.perks}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      <div className="space-y-1 text-xs">
                        <div className="text-muted-foreground flex items-center gap-1 truncate">
                          <span className="text-foreground font-semibold">1. Gốc:</span>
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
                          <span className="text-foreground font-semibold">2. Rút gọn:</span>
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
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          item.activeUrlType === 'SHORTENED'
                            ? 'border-success/30 bg-success/15 text-success hover:bg-success/25 border'
                            : 'border-primary/30 bg-primary/15 text-primary hover:bg-primary/25 border'
                        }`}
                        title={
                          item.activeUrlType === 'SHORTENED'
                            ? 'Đang bật: Link rút gọn kiếm tiền ($$$). Bấm để chuyển sang Link trực tiếp (Shopee/TikTok).'
                            : 'Đang bật: Link trực tiếp (Không qua rút gọn). Bấm để đổi sang Link kiếm tiền.'
                        }
                      >
                        {item.activeUrlType === 'SHORTENED' ? (
                          <>
                            <DollarSign className="size-3" /> Rút gọn ($$$)
                          </>
                        ) : (
                          <>
                            <Zap className="size-3" /> Trực tiếp
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-center font-bold">{item.clickCount}</td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className={`rounded border px-2.5 py-0.5 text-xs transition ${
                          item.active
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {item.active ? 'Đã đăng' : 'Nháp'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="size-8 p-0"
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="text-destructive hover:bg-destructive/10 size-8 p-0"
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

      {/* Modal Thêm/Sửa Sản phẩm Shopee/TikTok */}
      <Dialog
        open={isCreateOpen || editingItem !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? `Chỉnh sửa: ${editingItem.name}` : 'Thêm Sản Phẩm Shopee / TikTok'}
        description="Nhập thông tin sản phẩm, sau đó dán link Affiliate để hệ thống tự rút gọn."
        className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave(editingItem?.active ?? false);
          }}
          className="space-y-5"
        >
          <section className="border-border bg-muted/20 space-y-4 rounded-2xl border p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <ShoppingBag className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">1. Thông tin hiển thị</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Đây là nội dung khách hàng sẽ thấy trên card sản phẩm.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">Tên sản phẩm *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Bàn phím cơ Aula F75"
                  required
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Sàn thương mại *</label>
                <select
                  value={platform}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPlatform(val);
                    if (val === 'Shopee') setCategory('SHOPEE');
                    else if (val === 'TikTok Shop') setCategory('TIKTOK');
                    else setCategory('SHOPPING');
                  }}
                  className="border-border bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm font-medium"
                >
                  <option value="Shopee">Shopee</option>
                  <option value="TikTok Shop">TikTok Shop</option>
                  <option value="Lazada">Lazada</option>
                  <option value="Khác">Sàn khác (Tiki, web riêng...)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">
                  Danh mục sản phẩm (Quần áo, Balo, Mỹ phẩm...)
                </label>
                <Input
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder="VD: Quần áo, Balo, Mỹ phẩm, Điện thoại..."
                  className="mt-1 text-sm"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    'Quần áo',
                    'Balo',
                    'Mỹ phẩm',
                    'Điện thoại',
                    'Bàn phím',
                    'Phụ kiện',
                    'Gia dụng',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSubCategory(tag)}
                      className={`cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                        subCategory === tag
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Ảnh sản phẩm</label>
                  <span className="text-muted-foreground text-[11px]">
                    Tải từ máy hoặc dán link URL
                  </span>
                </div>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://cf.shopee.vn/... hoặc tải từ máy"
                    className="flex-1 text-sm"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUploadImage}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="shrink-0 gap-1.5 text-xs"
                    title="Chọn tệp ảnh từ máy tính để tải lên"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Đang tải...
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" /> Chọn từ máy
                      </>
                    )}
                  </Button>
                </div>
                {uploadError && (
                  <p className="text-destructive mt-1 text-[11px] font-medium">{uploadError}</p>
                )}

                {/* Preview Thumbnail */}
                {logoUrl && (
                  <div className="border-border/80 bg-muted/40 mt-2 flex items-center gap-2.5 rounded-lg border p-2">
                    <img
                      src={logoUrl}
                      alt="Xem trước ảnh"
                      className="border-border size-12 rounded border object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          '/images/products/default-affiliate-product.svg';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-xs font-medium">{logoUrl}</p>
                      <p className="text-muted-foreground text-[10px]">Ảnh hiển thị trên card</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl('')}
                      className="text-muted-foreground hover:text-destructive size-7 p-0"
                      title="Gỡ ảnh này"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Mô tả ngắn *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn gọn đặc điểm chính của sản phẩm..."
                required
                rows={3}
                maxLength={220}
                className="border-border bg-background mt-1 w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
              <p className="text-muted-foreground mt-1 text-right text-[11px]">
                {description.length}/220 ký tự
              </p>
            </div>
          </section>

          {/* 2 ĐƯỜNG LINK & CHẾ ĐỘ CHUYỂN HƯỚNG */}
          <section className="border-primary/30 bg-primary/5 space-y-4 rounded-2xl border p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Zap className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">2. Link Affiliate & Chế độ chuyển hướng</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Linh hoạt: Dùng link trực tiếp Shopee/TikTok HOẶC link rút gọn kiếm tiền.
                  </p>
                </div>
              </div>

              {/* Checkbox tự động rút gọn */}
              {shortenerConfigured && (
                <label className="text-muted-foreground hover:text-foreground bg-card/70 border-border/60 flex cursor-pointer items-center gap-2 self-start rounded-lg border px-2.5 py-1.5 text-xs sm:self-auto">
                  <input
                    type="checkbox"
                    checked={autoShortenOnPaste}
                    onChange={(e) => handleToggleAutoShorten(e.target.checked)}
                    className="border-border text-primary focus:ring-primary rounded"
                  />
                  <span>Tự động rút gọn khi dán link</span>
                </label>
              )}
            </div>

            {!shortenerConfigured && (
              <div className="border-warning/25 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-3 text-xs">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Chưa cấu hình API rút gọn. Bạn hoàn toàn có thể dán link gốc và lưu sản phẩm để
                  dùng link trực tiếp (Shopee/TikTok).
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Dán link Affiliate gốc <span className="text-destructive">*</span>
                </label>
                <span className="text-muted-foreground text-[11px]">
                  (Shopee, TikTok Shop, Lazada hoặc website đối tác)
                </span>
              </div>
              <div className="mt-1 flex gap-2">
                <Input
                  value={directUrl}
                  onChange={(e) => handleDirectUrlChange(e.target.value)}
                  onPaste={handleDirectUrlPaste}
                  placeholder="https://shope.ee/... hoặc https://shopee.vn/..."
                  required
                  className="text-sm"
                />
                {shortenerConfigured && (
                  <Button
                    type="button"
                    onClick={() => void handleGenerateShortUrl()}
                    disabled={isShortening || !directUrl}
                    variant="outline"
                    className="bg-card border-warning/30 text-warning hover:bg-warning/10 shrink-0 gap-1.5 text-xs"
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
                )}
              </div>
            </div>

            {isShortening && (
              <div className="border-info/20 bg-info/10 text-info flex items-center gap-2 rounded-lg border p-3 text-xs font-medium">
                <Loader2 className="size-4 shrink-0 animate-spin" />
                <span>Đang tạo link rút gọn kiếm tiền qua máy chủ...</span>
              </div>
            )}

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

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Link rút gọn kiếm tiền (tùy chọn)</label>
                {shortenedUrl && (
                  <button
                    type="button"
                    onClick={handleClearShortenedUrl}
                    className="text-destructive hover:text-destructive flex items-center gap-1 text-[11px] font-medium hover:underline"
                  >
                    <Trash2 className="size-3" /> Xóa link rút gọn (Chỉ dùng link gốc)
                  </button>
                )}
              </div>
              <Input
                value={shortenedUrl}
                onChange={(e) => setShortenedUrl(e.target.value)}
                placeholder="https://link4m.net/... (Để trống nếu không muốn dùng link rút gọn)"
                className="text-success mt-1 font-mono text-sm"
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                {shortenedUrl
                  ? 'Đã có link rút gọn. Bạn có thể chọn Chế độ link bên dưới hoặc bấm "Xóa link rút gọn" nếu muốn bỏ.'
                  : 'Để trống nếu bạn không muốn khách phải qua link rút gọn.'}
              </p>
            </div>

            <div className="border-border/70 space-y-2 border-t pt-2">
              <span className="text-foreground text-xs font-semibold">
                Chế độ link áp dụng khi khách bấm xem:
              </span>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* Lựa chọn 1: Link trực tiếp */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
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
                    <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                      <Zap className="text-primary size-3.5" />
                      <span>Link trực tiếp (Không qua rút gọn)</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-tight">
                      Mở thẳng Shopee / TikTok / Website gốc. Không quảng cáo, không captcha, trải
                      nghiệm mượt mà nhất.
                    </p>
                  </div>
                </label>

                {/* Lựa chọn 2: Link rút gọn kiếm tiền */}
                <label
                  className={`flex items-start gap-3 rounded-xl border transition ${
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
                    <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                      <DollarSign className="text-success size-3.5" />
                      <span>Link rút gọn kiếm tiền ($$$)</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-tight">
                      {shortenedUrl
                        ? 'Khách đi qua link rút gọn quảng cáo để bạn kiếm doanh thu từ lượt click.'
                        : 'Chưa có link rút gọn. Bấm nút "Rút gọn kiếm tiền" ở trên nếu muốn tạo.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </section>

          <div className="border-border bg-card/95 sticky bottom-0 z-10 flex justify-end gap-2 border-t py-3 backdrop-blur">
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
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSubmitting || isShortening}
            >
              {editingItem?.active ? 'Chuyển về nháp' : 'Lưu nháp'}
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={() => handleSave(true)}
              disabled={isSubmitting || isShortening}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang lưu...
                </>
              ) : editingItem?.active ? (
                'Cập nhật'
              ) : (
                'Đăng'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
