'use client';

import { useActionState, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { saveProduct } from '@/server/actions/product';
import { Button, buttonStyles } from '@/components/ui/button';
import { FileUp, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { uploadCoverImage } from '@/server/actions/post';
import { ProductCover } from '@/components/shop/product-cover';

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
  kind: 'SOURCE_CODE' | 'SHOP';
  saleMode: 'FREE' | 'CONTACT' | 'PAID';
  status: string;
  priceVnd: number;
  coverUrl: string;
};

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

function CoverPicker({
  name,
  slug,
  kind,
  version,
  defaultUrl,
  onUploadStart,
  onUploadEnd,
}: {
  name: string;
  slug: string;
  kind: 'SOURCE_CODE' | 'SHOP';
  version: string;
  defaultUrl: string;
  onUploadStart: () => void;
  onUploadEnd: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('Ảnh tối đa 8 MB.');
      return;
    }
    setError('');
    setUploading(true);
    onUploadStart();
    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadCoverImage(formData);
      if (result.success && result.url) setCoverUrl(result.url);
      else setError(result.error || 'Không thể tải ảnh lên.');
    } catch {
      setError('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setUploading(false);
      onUploadEnd();
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        className="sr-only"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <div className="relative">
        <ProductCover
          name={name || 'Tên sản phẩm'}
          slug={slug}
          coverUrl={coverUrl}
          kind={kind}
          version={version}
          className="border-border rounded-lg border"
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          {coverUrl ? 'Đổi ảnh' : 'Chọn ảnh từ máy'}
        </Button>
        {coverUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => setCoverUrl('')}
            title="Xóa ảnh, dùng ảnh bìa tự động"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {coverUrl
          ? 'Đang dùng ảnh bạn tải lên. Xóa ảnh để quay về ảnh bìa tự động.'
          : 'Để trống sẽ tự tạo ảnh bìa theo tên sản phẩm như trên. Nên dùng ảnh 16:9 (1280×720).'}
      </p>
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
  kind,
  files = [],
}: {
  product?: Product;
  kind: 'SOURCE_CODE' | 'SHOP';
  files?: { id: string; label: string; version: string; sizeBytes: number }[];
}) {
  const [state, action, pending] = useActionState(saveProduct, { error: '' });
  const [mode, setMode] = useState(product?.saleMode || 'FREE');
  const [name, setName] = useState(product?.name || '');
  const [version, setVersion] = useState(product?.version || '1.0.0');
  const [slug, setSlug] = useState(product?.slug || '');
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [description, setDescription] = useState(product?.description || '');
  const [shortDesc, setShortDesc] = useState(product?.shortDesc || '');
  const [editorError, setEditorError] = useState('');
  const [uploadCount, setUploadCount] = useState(0);
  const searchParams = useSearchParams();
  const isSource = kind === 'SOURCE_CODE';
  const isPublished = product?.status === 'ACTIVE';
  const publishLabel = isPublished
    ? 'Cập nhật'
    : mode === 'FREE'
      ? isSource
        ? 'Đăng source miễn phí'
        : 'Đăng sản phẩm miễn phí'
      : isSource
        ? 'Đăng bán source code'
        : 'Đăng bán sản phẩm';
  const catalog = kind === 'SOURCE_CODE' ? 'source-code' : 'shop';
  const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2.5 text-sm';
  const panelClass = 'border-border bg-card space-y-4 rounded-xl border p-5';
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={product?.id || ''} />
      <input type="hidden" name="kind" value={kind} />
      <div className="border-border bg-background/95 sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 backdrop-blur">
        <span className="text-muted-foreground text-sm">
          {isSource
            ? 'Thông tin source code & thiết lập bán hàng'
            : 'Thông tin sản phẩm & thiết lập bán hàng'}
        </span>
        <div className="flex flex-wrap gap-2">
          {product?.status === 'ACTIVE' && (
            <Link
              href={`/${catalog}/${product.slug}`}
              target="_blank"
              className={buttonStyles({ variant: 'outline' })}
            >
              Xem trang sản phẩm
            </Link>
          )}
          <Button
            type="submit"
            name="status"
            value="DRAFT"
            variant="outline"
            disabled={pending || uploadCount > 0}
          >
            {isPublished ? 'Chuyển về nháp' : 'Lưu nháp'}
          </Button>
          <Button
            type="submit"
            name="status"
            value="ACTIVE"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={pending || uploadCount > 0}
          >
            {uploadCount > 0 ? 'Đang tải ảnh…' : pending ? 'Đang lưu…' : publishLabel}
          </Button>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {!state.error && searchParams.get('saved') === '1' && (
        <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
          Đã lưu sản phẩm.
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section className={panelClass}>
            <h2 className="font-semibold">
              {isSource ? 'Thông tin source code' : 'Thông tin sản phẩm'}
            </h2>
            <label className="block space-y-2 text-sm font-medium">
              {isSource ? 'Tên source code / app / tool' : 'Tên sản phẩm'}
              <input
                className={`${inputClass} text-lg font-semibold`}
                name="name"
                placeholder="Ví dụ: Tool quản lý công việc bằng Next.js"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slugEdited) setSlug(slugify(event.target.value));
                }}
                required
                maxLength={200}
              />
            </label>
            <label className="block space-y-2 text-sm">
              Đường dẫn sản phẩm
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">/{catalog}/</span>
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
                />
              </div>
            </label>
            <label className="block space-y-2 text-sm">
              Tóm tắt tính năng
              <textarea
                name="shortDesc"
                className={inputClass}
                value={shortDesc}
                onChange={(event) => setShortDesc(event.target.value)}
                required
                maxLength={500}
                rows={3}
                placeholder="Tóm tắt sản phẩm làm được gì và dành cho ai…"
              />
              <span className="text-muted-foreground text-xs">{shortDesc.length}/500 ký tự</span>
            </label>
          </section>
          <section className="min-w-0 space-y-3">
            <h2 className="font-semibold">Mô tả sản phẩm & hướng dẫn sử dụng</h2>
            <p className="text-muted-foreground text-sm">
              {isSource
                ? 'Mô tả chức năng, công nghệ sử dụng, yêu cầu hệ thống, cách cài đặt và phạm vi hỗ trợ. Chèn ảnh giao diện hoặc ảnh demo để người mua xem trước.'
                : 'Mô tả tính năng, lợi ích, cách sử dụng và thông tin hỗ trợ. Có thể chèn ảnh minh họa sản phẩm.'}
            </p>
            <input type="hidden" name="description" value={description} />
            <RichTextEditor
              value={description}
              onChange={setDescription}
              onError={setEditorError}
              onUploadStart={() => {
                setEditorError('');
                setUploadCount((count) => count + 1);
              }}
              onUploadEnd={() => setUploadCount((count) => Math.max(0, count - 1))}
            />
            {editorError && (
              <p role="alert" className="text-sm text-red-600">
                {editorError}
              </p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <section className={panelClass}>
            <h2 className="font-semibold">Ảnh bìa</h2>
            <CoverPicker
              name={name}
              slug={slug}
              kind={kind}
              version={version}
              defaultUrl={product?.coverUrl || ''}
              onUploadStart={() => setUploadCount((count) => count + 1)}
              onUploadEnd={() => setUploadCount((count) => Math.max(0, count - 1))}
            />
          </section>
          <section className={panelClass}>
            <h2 className="font-semibold">Trạng thái &amp; phiên bản</h2>
            <p className="text-muted-foreground text-xs">
              {isPublished
                ? 'Đang hiển thị công khai. Bấm "Chuyển về nháp" để tạm ẩn.'
                : 'Chưa đăng. Bấm "Lưu nháp" khi chưa hoàn tất, hoặc đăng ngay ở thanh trên cùng.'}
            </p>
            <label className="block space-y-2 text-sm">
              Số phiên bản
              <input
                name="version"
                className={inputClass}
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                required
                maxLength={50}
              />
            </label>
          </section>
          <section className={panelClass}>
            <h2 className="font-semibold">Hình thức & giá bán</h2>
            <label className="block space-y-2 text-sm">
              Hình thức
              <select
                name="saleMode"
                className={inputClass}
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
              >
                <option value="FREE">Miễn phí</option>
                <option value="CONTACT">Trả phí – Liên hệ báo giá</option>
                <option value="PAID">Trả phí – Đặt giá</option>
              </select>
            </label>
            <p className="text-muted-foreground text-xs">
              {mode === 'PAID'
                ? 'Khách thanh toán theo giá bạn đặt, sau đó nhận quyền tải file.'
                : mode === 'CONTACT'
                  ? 'Khách liên hệ để nhận báo giá và thống nhất bàn giao source.'
                  : 'Khách tải file miễn phí trực tiếp trên trang sản phẩm.'}
            </p>
            {mode === 'PAID' ? (
              <label className="block space-y-2 text-sm">
                Giá bán (VND)
                <input
                  type="number"
                  name="priceVnd"
                  min="1"
                  max="2147483647"
                  step="1"
                  defaultValue={product?.priceVnd || ''}
                  required
                  className={inputClass}
                />
              </label>
            ) : (
              <input type="hidden" name="priceVnd" value="0" />
            )}
          </section>
          <section className={panelClass}>
            <h2 className="font-semibold">
              {isSource ? 'Gói mã nguồn bàn giao' : 'File sản phẩm bàn giao'}
            </h2>
            {files.length > 0 && (
              <ul className="space-y-3">
                {files.map((file) => (
                  <li key={file.id} className="text-sm">
                    <p className="font-medium break-words">{file.label}</p>
                    <p className="text-muted-foreground text-xs">
                      v{file.version} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <FilePicker
              label={isSource ? 'Upload source code (ZIP hoặc file khác)' : 'Upload file sản phẩm'}
            />
            <p className="text-muted-foreground text-xs">
              Tối đa 8 MB/file. File mới được thêm vào danh sách hiện có. Bản miễn phí và đặt giá
              cần có file trước khi công khai.
            </p>
          </section>
        </aside>
      </div>
    </form>
  );
}
