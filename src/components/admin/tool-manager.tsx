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
  Wrench,
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
  Terminal,
} from 'lucide-react';

interface ToolManagerProps {
  initialTools: AffiliateItem[];
}

export function ToolManager({ initialTools }: ToolManagerProps) {
  const [tools, setTools] = useState<AffiliateItem[]>(initialTools);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AffiliateItem | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<AffiliateCategory>('DEVTOOLS');
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
    setCategory('DEVTOOLS');
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

  const openEdit = (t: AffiliateItem) => {
    setEditingTool(t);
    setName(t.name);
    setSlug(t.slug);
    setCategory(t.category);
    setDescription(t.description);
    setPerks(t.perks || '');
    setCouponCode(t.couponCode || '');
    setDirectUrl(t.directUrl);
    setShortenedUrl(t.shortenedUrl || '');
    setActiveUrlType(t.activeUrlType);
    setLogoUrl(t.logoUrl || '');
    setFeatured(t.featured);
    setShortenMessage(null);
  };

  const handleGenerateShortUrl = async () => {
    if (!directUrl || !directUrl.startsWith('http')) {
      setShortenMessage({ type: 'error', text: 'Vui lòng dán link công cụ hợp lệ trước.' });
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
    formData.append('description', description);
    formData.append('perks', perks);
    formData.append('couponCode', couponCode);
    formData.append('directUrl', directUrl);
    formData.append('shortenedUrl', shortenedUrl);
    formData.append('activeUrlType', activeUrlType);
    formData.append('logoUrl', logoUrl);
    formData.append('featured', featured ? 'true' : 'false');

    try {
      if (editingTool) {
        await updateAffiliateItem(editingTool.id, formData);
        setEditingTool(null);
      } else {
        await createAffiliateItem(formData);
        setIsCreateOpen(false);
      }
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu tool code.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, toolName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tool "${toolName}"?`)) return;
    await deleteAffiliateItem(id);
    setTools((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggle = async (t: AffiliateItem) => {
    await toggleAffiliateStatus(t.id, t.active);
    setTools((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, active: !t.active } : item)),
    );
  };

  const handleSwitchLinkType = async (t: AffiliateItem) => {
    const nextType: AffiliateLinkType = t.activeUrlType === 'DIRECT' ? 'SHORTENED' : 'DIRECT';
    if (nextType === 'SHORTENED' && (!t.shortenedUrl || t.shortenedUrl.trim() === '')) {
      alert('Tool này chưa có Link rút gọn kiếm tiền. Vui lòng bấm Sửa để tạo link trước.');
      return;
    }
    await setAffiliateActiveLinkType(t.id, nextType);
    setTools((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, activeUrlType: nextType } : item)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-foreground flex items-center gap-2 font-semibold">
            <Wrench className="size-5 text-blue-500" /> Quản lý công cụ Affiliate
          </h3>
          <p className="text-muted-foreground text-xs">
            Quản lý các công cụ lập trình, SaaS AI (Cursor, Claude, Copilot, Coolify, Docker
            tools...)
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="size-4" /> Thêm công cụ Affiliate
        </Button>
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs uppercase">
                <th className="px-4 py-3">Công cụ & Logo</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">2 Đường Link</th>
                <th className="px-4 py-3 text-center">Chế độ link</th>
                <th className="px-4 py-3 text-center">Lượt Click</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {tools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground py-10 text-center">
                    Chưa có tool code nào. Hãy bấm &quot;Thêm công cụ Affiliate&quot; để thêm.
                  </td>
                </tr>
              ) : (
                tools.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {t.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={t.logoUrl}
                            alt=""
                            className="border-border bg-background size-9 shrink-0 rounded-lg border object-contain p-1"
                          />
                        ) : (
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-600">
                            <Terminal className="size-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-foreground font-medium">{t.name}</div>
                          <div className="text-muted-foreground font-mono text-xs">
                            /go/{t.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {t.category}
                      </Badge>
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      <div className="space-y-1 text-xs">
                        <div className="text-muted-foreground flex items-center gap-1 truncate">
                          <span className="text-foreground font-semibold">1. Gốc:</span>
                          <a
                            href={t.directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 truncate text-blue-500 hover:underline"
                          >
                            {t.directUrl} <ExternalLink className="size-3" />
                          </a>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 truncate">
                          <span className="text-foreground font-semibold">2. Rút gọn:</span>
                          {t.shortenedUrl ? (
                            <a
                              href={t.shortenedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 truncate font-medium text-emerald-500 hover:underline"
                            >
                              {t.shortenedUrl} <ExternalLink className="size-3" />
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
                        onClick={() => handleSwitchLinkType(t)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          t.activeUrlType === 'SHORTENED'
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                        title="Bấm để đổi chế độ link"
                      >
                        {t.activeUrlType === 'SHORTENED' ? (
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

                    <td className="px-4 py-3 text-center font-bold">{t.clickCount}</td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(t)}
                        className={`rounded border px-2.5 py-0.5 text-xs transition ${
                          t.active
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {t.active ? 'Bật' : 'Tắt'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(t)}
                          className="size-8 p-0"
                          title="Sửa"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t.id, t.name)}
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

      {/* Modal Thêm/Sửa Tool Code */}
      <Dialog
        open={isCreateOpen || editingTool !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingTool(null);
        }}
        title={editingTool ? `Chỉnh sửa: ${editingTool.name}` : 'Thêm công cụ Affiliate'}
        description="Điền thông tin công cụ, logo và link tải/đăng ký"
        className="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Tên công cụ / Tool *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cursor AI Editor"
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
                <option value="DEVTOOLS">Công cụ Dev & AI (DEVTOOLS)</option>
                <option value="DEVOPS">DevOps & Server (DEVOPS)</option>
                <option value="TOOLCODE">Script / Tool code (TOOLCODE)</option>
                <option value="SECURITY">Bảo mật (SECURITY)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">Logo URL</label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... (tuỳ chọn)"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Ưu đãi / Credits</label>
              <Input
                value={perks}
                onChange={(e) => setPerks(e.target.value)}
                placeholder="VD: 14 ngày Pro miễn phí"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">Mã Coupon giảm giá (nếu có)</label>
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="VD: DEVPRO20"
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold">Mô tả tính năng công cụ</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Công cụ này giúp giải quyết vấn đề gì cho lập trình viên..."
              className="border-border bg-background mt-1 w-full rounded-md border p-2 text-sm"
            />
          </div>

          {/* 2 ĐƯỜNG LINK */}
          <div className="border-border bg-muted/40 space-y-3 rounded-xl border p-4">
            <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
              <Zap className="size-4 text-blue-500" /> Cấu hình 2 Nguồn Link
            </h4>

            <div>
              <label className="text-xs font-medium">
                1. Link Công cụ Trực tiếp (Bạn dán vào) *
              </label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://cursor.com/?ref=..."
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
                      <Sparkles className="size-3.5 text-blue-500" /> Rút gọn kiếm tiền
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
              <label className="text-xs font-medium">2. Link Rút Gọn Kiếm Tiền</label>
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
                setEditingTool(null);
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
                'Lưu công cụ Affiliate'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
