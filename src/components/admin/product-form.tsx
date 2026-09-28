'use client';

import { useActionState, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { saveProduct } from '@/server/actions/product';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileUp, Pencil, X } from 'lucide-react';
import {
  ProductTypeStep,
  ShopInfoFields,
  ChoiceCard,
  DELIVERY_OPTIONS,
  type CategoryOption,
  type ShopDetailsValue,
} from '@/components/admin/shop/shop-details-section';
import { FormSection } from '@/components/admin/shop/form-section';
import { ImagePicker } from '@/components/admin/shop/image-picker';
import { PricingEditor } from '@/components/admin/shop/pricing-editor';
import { MoneyInput } from '@/components/admin/shop/money-input';
import { AccountOffer } from '@/components/admin/shop/account-offer';
import { missingForPublish, type VariantDefault } from '@/lib/shop/product-form';

const RichTextEditor = dynamic(
  () => import('@/components/admin/rich-text-editor').then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground p-6 text-sm">Đang tải trình soạn thảo…</p>,
  },
);

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDesc: string;
  description: string;
  version: string;
  saleMode: 'FREE' | 'CONTACT' | 'PAID';
  status: string;
  priceVnd: number;
  coverUrl: string;
  type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
  category: string | null;
  condition: string | null;
  conditionNote: string | null;
  warrantyNote: string | null;
  deliveryMode: 'AUTO' | 'MANUAL' | null;
  gallery: string[];
  hasOrders: boolean;
  variants: VariantDefault[];
};

/** Ảnh bìa + tối đa 20 ảnh thư viện (giới hạn `gallerySchema` phía server). */
const MAX_SHOP_IMAGES = 21;

const SALE_MODES = [
  {
    value: 'FREE',
    label: 'Miễn phí',
    hint: 'Khách tải file miễn phí trực tiếp trên trang sản phẩm.',
  },
  {
    value: 'PAID',
    label: 'Đặt giá',
    hint: 'Khách thanh toán theo giá bạn đặt, sau đó nhận quyền tải file.',
  },
  {
    value: 'CONTACT',
    label: 'Liên hệ báo giá',
    hint: 'Khách liên hệ để nhận báo giá và thống nhất bàn giao.',
  },
] as const;

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function FilePicker({ label, accept }: { label: string; accept?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const pick = (list: FileList | null) => {
    const file = list?.[0] ?? null;
    if (file && file.size > MAX_FILE_BYTES) {
      setError(`File "${file.name}" vượt quá 8 MB.`);
      if (inputRef.current) inputRef.current.value = '';
      setSelected(null);
      return;
    }
    setError('');
    setSelected(file);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    setSelected(null);
    setError('');
  };

  return (
    <div className="space-y-2 text-sm">
      <p>{label}</p>
      <input
        ref={inputRef}
        id="product-file"
        type="file"
        name="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => pick(event.target.files)}
      />
      {selected ? (
        <div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
          <FileUp className="text-primary size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{selected.name}</p>
            <p className="text-muted-foreground text-xs">
              {(selected.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground cursor-pointer rounded p-1"
            title="Bỏ chọn file"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="product-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (inputRef.current && event.dataTransfer.files.length) {
              inputRef.current.files = event.dataTransfer.files;
              pick(event.dataTransfer.files);
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/60 hover:bg-muted/40'
          }`}
        >
          <FileUp className="text-muted-foreground size-6" />
          <span className="font-medium">Chọn file từ máy</span>
          <span className="text-muted-foreground text-xs">hoặc kéo thả file vào đây</span>
        </label>
      )}
      {selected && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-primary cursor-pointer text-xs hover:underline"
        >
          Chọn file khác
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ProductForm({
  product,
  files = [],
  credentialKeyConfigured = false,
  accountAvailable = null,
  categories = [],
  children,
}: {
  product?: Product;
  files?: { id: string; label: string; version: string; sizeBytes: number }[];
  credentialKeyConfigured?: boolean;
  /** Số tài khoản còn trống trong kho (tài khoản số gửi tự động đã lưu). */
  accountAvailable?: number | null;
  categories?: CategoryOption[];
  /** Nội dung thêm ở cột chính, nằm ngoài <form> (vd. kho tài khoản có form riêng). */
  children?: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveProduct, { error: '' });
  const [mode, setMode] = useState(product?.saleMode || 'FREE');
  const [downloadPrice, setDownloadPrice] = useState(
    product?.priceVnd ? String(product.priceVnd) : '',
  );
  const [variantPrices, setVariantPrices] = useState<string[]>(
    () =>
      product?.variants.filter((variant) => variant.active).map((v) => String(v.priceVnd)) ?? [],
  );
  const [name, setName] = useState(product?.name || '');
  const [version, setVersion] = useState(product?.version || '1.0.0');
  const [slug, setSlug] = useState(product?.slug || '');
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [slugOpen, setSlugOpen] = useState(false);
  const [description, setDescription] = useState(product?.description || '');
  const [shortDesc, setShortDesc] = useState(product?.shortDesc || '');
  const [editorError, setEditorError] = useState('');
  const [uploadCount, setUploadCount] = useState(0);
  const [shop, setShop] = useState<ShopDetailsValue>({
    type: product?.type ?? '',
    category: product?.category ?? '',
    condition: (product?.condition as ShopDetailsValue['condition']) ?? '',
    conditionNote: product?.conditionNote ?? '',
    warrantyNote: product?.warrantyNote ?? '',
    deliveryMode: product?.deliveryMode ?? '',
  });
  const [categoryList, setCategoryList] = useState(categories);
  const searchParams = useSearchParams();
  const justSaved = searchParams.get('saved') === '1';

  const isSource = shop.type === 'DOWNLOAD';
  const typeChosen = shop.type !== '';
  const isShopGoods = shop.type === 'PHYSICAL' || shop.type === 'ACCOUNT';
  const isAutoAccount = shop.type === 'ACCOUNT' && shop.deliveryMode === 'AUTO';
  const updateShop = (patch: Partial<ShopDetailsValue>) =>
    setShop((prev) => ({ ...prev, ...patch }));
  // Sản phẩm tài khoản cũ có nhiều gói vẫn dùng bảng phân loại; còn lại bán một giá.
  const legacyAccountPackages = product?.type === 'ACCOUNT' && product.variants.length > 1;
  const isSimpleAccount = shop.type === 'ACCOUNT' && !legacyAccountPackages;
  const isPublished = product?.status === 'ACTIVE';
  const trackUpload = {
    onUploadStart: () => setUploadCount((count) => count + 1),
    onUploadEnd: () => setUploadCount((count) => Math.max(0, count - 1)),
  };

  const missing = missingForPublish({
    type: shop.type,
    name,
    shortDesc,
    category: shop.category,
    deliveryMode: shop.deliveryMode,
    saleMode: mode,
    downloadPrice,
    variantPrices,
  });

  const publishLabel = isPublished
    ? 'Cập nhật'
    : !isShopGoods && mode === 'FREE'
      ? isSource
        ? 'Đăng source miễn phí'
        : 'Đăng sản phẩm miễn phí'
      : isSource
        ? 'Đăng bán source code'
        : 'Đăng bán';

  const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';
  const busy = pending || uploadCount > 0 || !typeChosen;
  const submitLabel = uploadCount > 0 ? 'Đang tải ảnh…' : pending ? 'Đang lưu…' : publishLabel;

  // Enter trong ô nhập không được gửi form (dễ bấm nhầm khi đang gõ giá, tên…).
  const blockEnterSubmit = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT')
      event.preventDefault();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <form action={action} onKeyDown={blockEnterSubmit} className="space-y-5">
        <input type="hidden" name="id" value={product?.id || ''} />

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            {state.error}
          </p>
        )}
        {!state.error && justSaved && (
          <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
            Đã lưu sản phẩm.
          </p>
        )}

        <FormSection title="Loại sản phẩm">
          <ProductTypeStep
            value={shop}
            onChange={updateShop}
            typeLocked={Boolean(product?.hasOrders)}
          />
        </FormSection>

        <FormSection title="Danh mục & bảo hành">
          <ShopInfoFields
            value={shop}
            onChange={updateShop}
            categories={categoryList}
            onCategoryCreated={(category) => setCategoryList((prev) => [...prev, category])}
          />
        </FormSection>

        <FormSection title="Thông tin sản phẩm">
          <label className="block space-y-2 text-sm font-medium">
            {isSource ? 'Tên source code / app / tool' : 'Tên sản phẩm'}
            <input
              className={`${inputClass} text-base font-semibold`}
              name="name"
              placeholder={
                isSource
                  ? 'Ví dụ: Tool quản lý công việc bằng Next.js'
                  : shop.type === 'ACCOUNT'
                    ? 'Ví dụ: Netflix Premium 1 tháng'
                    : 'Ví dụ: Áo thun cotton logo HVP'
              }
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              required
              maxLength={200}
            />
            <span className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs font-normal">
              Đường dẫn: /shop/{slug || '…'}
              {!slugOpen && (
                <button
                  type="button"
                  onClick={() => setSlugOpen(true)}
                  className="text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  <Pencil className="size-3" /> Sửa
                </button>
              )}
            </span>
          </label>
          {slugOpen ? (
            <label className="block space-y-2 text-sm">
              Đường dẫn sản phẩm
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">/shop/</span>
                <input
                  name="slug"
                  className={inputClass}
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(event.target.value);
                  }}
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Chỉ dùng chữ thường không dấu, số và dấu gạch ngang"
                />
              </div>
            </label>
          ) : (
            <input type="hidden" name="slug" value={slug} />
          )}
          <label className="block space-y-2 text-sm font-medium">
            Mô tả ngắn
            <textarea
              name="shortDesc"
              className={`${inputClass} font-normal`}
              value={shortDesc}
              onChange={(event) => setShortDesc(event.target.value)}
              required
              maxLength={500}
              rows={3}
              placeholder="1–2 câu: sản phẩm là gì, dành cho ai, điểm nổi bật…"
            />
            <span className="text-muted-foreground flex justify-between text-xs font-normal">
              <span>Hiển thị ở danh sách sản phẩm.</span>
              <span>{shortDesc.length}/500</span>
            </span>
          </label>
        </FormSection>

        <FormSection title="Ảnh sản phẩm">
          <ImagePicker
            defaultCover={product?.coverUrl || ''}
            defaultGallery={product?.gallery ?? []}
            max={MAX_SHOP_IMAGES}
            {...trackUpload}
          />
        </FormSection>

        {!typeChosen ? (
          <FormSection title="Giá & số lượng">
            <p className="text-muted-foreground border-border rounded-lg border border-dashed p-4 text-center text-sm">
              Chọn loại sản phẩm ở trên để nhập giá.
            </p>
          </FormSection>
        ) : isSimpleAccount ? (
          <>
            <input type="hidden" name="saleMode" value="PAID" />
            <input type="hidden" name="priceVnd" value="0" />
            <input type="hidden" name="version" value={version} />
            <AccountOffer
              defaultVariant={product?.variants.find((variant) => variant.active)}
              deliveryMode={shop.deliveryMode}
              onDeliveryModeChange={(deliveryMode) => updateShop({ deliveryMode })}
              keyConfigured={credentialKeyConfigured}
              availableCount={accountAvailable}
              onPricesChange={setVariantPrices}
            />
          </>
        ) : isShopGoods ? (
          <FormSection
            title="Phân loại, giá & số lượng"
            hint={
              shop.type === 'ACCOUNT'
                ? 'Mỗi dòng là một gói: tên gói, giá và số lượng.'
                : 'Mỗi dòng là một phân loại: màu, size, giá và số lượng. Nhập xong bấm “Thêm màu / size khác”.'
            }
          >
            <input type="hidden" name="saleMode" value="PAID" />
            <input type="hidden" name="priceVnd" value="0" />
            <input type="hidden" name="version" value={version} />
            {shop.type === 'ACCOUNT' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {DELIVERY_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    selected={shop.deliveryMode === option.value}
                    label={option.label}
                    hint={option.hint}
                    onClick={() => updateShop({ deliveryMode: option.value })}
                  />
                ))}
              </div>
            )}
            <PricingEditor
              defaultValue={product?.variants ?? []}
              goodsType={shop.type === 'ACCOUNT' ? 'ACCOUNT' : 'PHYSICAL'}
              stockFromAccounts={isAutoAccount}
              onPricesChange={setVariantPrices}
            />
          </FormSection>
        ) : (
          <FormSection
            title="Giá & file bàn giao"
            hint="Khách nhận file này sau khi tải miễn phí hoặc thanh toán."
          >
            <input type="hidden" name="saleMode" value={mode} />
            <div className="grid gap-2 sm:grid-cols-3">
              {SALE_MODES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  aria-pressed={mode === option.value}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    mode === option.value
                      ? 'border-primary bg-primary/5 ring-primary ring-1'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <span className="block font-semibold">{option.label}</span>
                  <span className="text-muted-foreground text-xs">{option.hint}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mode === 'PAID' ? (
                <label className="block space-y-2 text-sm font-medium">
                  Giá bán
                  <MoneyInput
                    name="priceVnd"
                    value={downloadPrice}
                    onChange={setDownloadPrice}
                    label="Giá bán"
                    required
                  />
                </label>
              ) : (
                <input type="hidden" name="priceVnd" value="0" />
              )}
              <label className="block space-y-2 text-sm">
                Phiên bản
                <input
                  name="version"
                  className={inputClass}
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  required
                  maxLength={50}
                />
              </label>
            </div>
            <div className="space-y-2">
              {files.length > 0 && (
                <ul className="border-border divide-border divide-y rounded-lg border">
                  {files.map((file) => (
                    <li key={file.id} className="flex items-center gap-3 p-3 text-sm">
                      <FileUp className="text-muted-foreground size-4 shrink-0" />
                      <span className="min-w-0 flex-1 font-medium break-words">{file.label}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        v{file.version} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <FilePicker
                label={
                  files.length > 0
                    ? 'Thêm bản mới'
                    : isSource
                      ? 'File source code (ZIP hoặc file khác)'
                      : 'File sản phẩm'
                }
              />
              <p className="text-muted-foreground text-xs">
                Tối đa 8 MB/file. File mới được thêm vào danh sách hiện có.
                {mode !== 'CONTACT' && ' Cần có file trước khi đăng.'}
              </p>
            </div>
          </FormSection>
        )}

        <FormSection
          title="Mô tả chi tiết (tùy chọn)"
          hint={
            isSource
              ? 'Chức năng, công nghệ, yêu cầu hệ thống, cách cài đặt, phạm vi hỗ trợ. Có thể chèn ảnh demo.'
              : 'Tính năng, chất liệu, kích thước, cách sử dụng… Có thể chèn ảnh minh họa.'
          }
        >
          <input type="hidden" name="description" value={description} />
          <RichTextEditor
            value={description}
            onChange={setDescription}
            onError={setEditorError}
            onUploadStart={() => {
              setEditorError('');
              trackUpload.onUploadStart();
            }}
            onUploadEnd={trackUpload.onUploadEnd}
          />
          {editorError && (
            <p role="alert" className="text-sm text-red-600">
              {editorError}
            </p>
          )}
        </FormSection>

        {/* Thanh nút dính đáy màn hình: luôn thấy trạng thái và nút lưu. */}
        <div className="border-border bg-background/95 sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-xl sm:border-x sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <Badge variant={isPublished ? 'default' : 'outline'} className="shrink-0">
              {isPublished ? 'Đang hiển thị' : product ? 'Bản nháp' : 'Mới'}
            </Badge>
            {missing.length > 0 ? (
              <span className="text-muted-foreground truncate">
                Còn thiếu: <span className="text-foreground">{missing.join(', ')}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="size-4" /> Sẵn sàng đăng
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isPublished && (
              <Link
                href={`/shop/${product.slug}`}
                target="_blank"
                className={buttonStyles({ variant: 'ghost' })}
              >
                Xem trang ↗
              </Link>
            )}
            {/* Lưu nháp không bắt điền đủ mọi ô — server vẫn kiểm tra tên và danh mục. */}
            <Button
              type="submit"
              name="status"
              value="DRAFT"
              variant="outline"
              formNoValidate
              disabled={busy}
            >
              {isPublished ? 'Chuyển về nháp' : 'Lưu nháp'}
            </Button>
            <Button
              type="submit"
              name="status"
              value="ACTIVE"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={busy}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>

      {children}
    </div>
  );
}
