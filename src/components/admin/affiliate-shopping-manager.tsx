'use client';

import { useState } from 'react';
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
} from 'lucide-react';

interface ShoppingAffiliateManagerProps {
  initialItems: AffiliateItem[];
}

export function ShoppingAffiliateManager({ initialItems }: ShoppingAffiliateManagerProps) {
  const [items, setItems] = useState<AffiliateItem[]>(initialItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AffiliateItem | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<AffiliateCategory>('SHOPEE');
  const [platform, setPlatform] = useState('Shopee');
  const [description, setDescription] = useState('');
  const [perks, setPerks] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState('');
  const [activeUrlType, setActiveUrlType] = useState<AffiliateLinkType>('DIRECT');
  const [logoUrl, setLogoUrl] = useState('');
  const [featured, setFeatured] = useState(false);

  const [isShortening, setIsShortening] = useState(false);
  const [shortenMessage, setShortenMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setSlug('');
    setCategory('SHOPEE');
    setPlatform('Shopee');
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
    setPlatform(item.platform || (item.category === 'TIKTOK' ? 'TikTok Shop' : 'Shopee'));
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

  const handleGenerateShortUrl = async () => {
    if (!directUrl || !directUrl.startsWith('http')) {
      setShortenMessage({ type: 'error', text: 'Vui lòng dán link Shopee/TikTok hợp lệ trước.' });
      return;
    }

    setIsShortening(true);
    setShortenMessage(null);

    try {
      const res = await generateShortUrlAction(directUrl);
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
    formData.append('platform', platform);
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
            <ShoppingBag className="size-5 text-amber-500" /> Quản lý Affiliate Shopee & TikTok Shop
          </h3>
          <p className="text-muted-foreground text-xs">
            Dán link affiliate sản phẩm từ Shopee, TikTok Shop, bàn phím, phụ kiện dev và tạo link
            rút gọn kiếm tiền.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-amber-600 text-white hover:bg-amber-700">
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
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-600">
                            {item.category === 'TIKTOK' ? 'TT' : 'SHP'}
                          </div>
                        )}
                        <div>
                          <div className="text-foreground font-medium">{item.name}</div>
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                              {item.category === 'TIKTOK' ? 'TikTok Shop' : 'Shopee'}
                            </Badge>
                            {item.perks && (
                              <span className="text-[11px] font-medium text-emerald-500">
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
                            className="inline-flex items-center gap-0.5 truncate text-blue-500 hover:underline"
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
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          item.activeUrlType === 'SHORTENED'
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                        title="Bấm để đổi chế độ link"
                      >
                        {item.activeUrlType === 'SHORTENED' ? (
                          <>
                            <DollarSign className="size-3" /> Kiếm tiền
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
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground border-border'
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
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="size-8 p-0 text-rose-500 hover:bg-rose-500/10"
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
        description="Nhập link sản phẩm và cấu hình link rút gọn kiếm tiền"
        className="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
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
              <label className="text-xs font-semibold">Nền tảng</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AffiliateCategory)}
                className="border-border bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="SHOPEE">Shopee</option>
                <option value="TIKTOK">TikTok Shop</option>
                <option value="SHOPPING">Khác (Lazada, Tiki...)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Ảnh sản phẩm (URL)</label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://cf.shopee.vn/..."
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Ưu đãi / Flash Sale</label>
              <Input
                value={perks}
                onChange={(e) => setPerks(e.target.value)}
                placeholder="VD: Giảm 40% + Freeship"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">Mã Voucher giảm giá (nếu có)</label>
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="VD: SHOPEE20K"
              className="mt-1 text-sm"
            />
          </div>

          {/* 2 ĐƯỜNG LINK */}
          <div className="border-border bg-muted/40 space-y-3 rounded-xl border p-4">
            <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
              <Zap className="size-4 text-amber-500" /> Cấu hình Link Affiliate
            </h4>

            <div>
              <label className="text-xs font-medium">
                1. Link Affiliate Shopee/TikTok (Bạn dán vào) *
              </label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://shope.ee/..."
                  required
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={handleGenerateShortUrl}
                  disabled={isShortening || !directUrl}
                  variant="outline"
                  className="bg-card shrink-0 gap-1.5 text-xs"
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

            <div>
              <label className="text-xs font-medium">
                2. Link Rút Gọn Kiếm Tiền (Tự sinh hoặc dán tay)
              </label>
              <Input
                value={shortenedUrl}
                onChange={(e) => setShortenedUrl(e.target.value)}
                placeholder="https://megaurl.in/..."
                className="mt-1 font-mono text-sm text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div className="border-border/70 flex items-center justify-between border-t pt-2 text-xs">
              <span className="font-semibold">Chế độ link áp dụng:</span>
              <div className="flex items-center gap-4">
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
                <label className="flex cursor-pointer items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <input
                    type="radio"
                    name="activeUrlType"
                    value="SHORTENED"
                    checked={activeUrlType === 'SHORTENED'}
                    onChange={() => setActiveUrlType('SHORTENED')}
                  />
                  <span>Link rút gọn ($$$)</span>
                </label>
              </div>
            </div>
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
                'Lưu Sản Phẩm'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
