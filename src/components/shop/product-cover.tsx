import { cn } from '@/lib/utils';

interface ProductCoverProps {
  name: string;
  slug: string;
  coverUrl?: string | null;
  kind?: 'SOURCE_CODE' | 'SHOP';
  version?: string;
  className?: string;
}

/** Bảng màu gradient; chọn theo slug để mỗi sản phẩm có màu ổn định. */
const PALETTES = [
  ['#0f172a', '#1e3a8a', '#38bdf8'],
  ['#111827', '#4c1d95', '#a78bfa'],
  ['#052e2b', '#065f46', '#34d399'],
  ['#1c1917', '#7c2d12', '#fb923c'],
  ['#0c0a09', '#831843', '#f472b6'],
  ['#0b1120', '#155e75', '#22d3ee'],
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/**
 * Ảnh bìa sản phẩm. Nếu chưa upload ảnh, tự dựng ảnh bìa dạng "cửa sổ ứng dụng"
 * với tên sản phẩm để thẻ sản phẩm vẫn trông chuyên nghiệp.
 */
export function ProductCover({
  name,
  slug,
  coverUrl,
  kind = 'SOURCE_CODE',
  version,
  className,
}: ProductCoverProps) {
  if (coverUrl) {
    return (
      <div className={cn('bg-muted relative aspect-video w-full overflow-hidden', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt={name} className="size-full object-cover" loading="lazy" />
      </div>
    );
  }

  const hash = hashString(slug || name);
  const [from, via, accent] = PALETTES[hash % PALETTES.length] ?? PALETTES[0];
  const isSource = kind === 'SOURCE_CODE';
  const fileName = `${slug || 'app'}${isSource ? '.tsx' : ''}`;
  // Độ dài các dòng "code" giả, thay đổi theo slug cho đỡ đơn điệu
  const lines = Array.from({ length: 5 }, (_, i) => 35 + ((hash >> (i * 3)) % 50));

  return (
    <div
      role="img"
      aria-label={name}
      className={cn('@container relative aspect-video w-full overflow-hidden', className)}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${via} 60%, ${from} 100%)` }}
    >
      {/* Lưới nền */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* Quầng sáng */}
      <div
        className="absolute -top-1/3 -right-1/4 size-3/4 rounded-full opacity-40 blur-3xl"
        style={{ background: accent }}
      />

      <div className="relative flex h-full gap-[5cqw] p-[6cqw]">
        {/* Tên sản phẩm */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <span
            className="w-fit rounded-full border px-[2.5cqw] py-[1cqw] text-[2.6cqw] font-semibold tracking-widest uppercase"
            style={{ borderColor: `${accent}66`, color: accent }}
          >
            {isSource ? 'Source Code' : 'Digital Product'}
          </span>
          <p className="line-clamp-3 text-[6.2cqw] leading-tight font-extrabold text-white">
            {name}
          </p>
          <span className="font-mono text-[2.6cqw] text-white/60">
            {version ? `v${version}` : 'dltoan07'}
          </span>
        </div>

        {/* Cửa sổ ứng dụng */}
        <div className="flex w-[42%] shrink-0 flex-col self-center overflow-hidden rounded-[1.5cqw] border border-white/15 bg-black/40 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-[1cqw] border-b border-white/10 px-[2cqw] py-[1.6cqw]">
            <span className="size-[1.6cqw] rounded-full bg-red-400/80" />
            <span className="size-[1.6cqw] rounded-full bg-amber-400/80" />
            <span className="size-[1.6cqw] rounded-full bg-emerald-400/80" />
            <span className="ml-[1.5cqw] truncate font-mono text-[2cqw] text-white/50">
              {fileName}
            </span>
          </div>
          <div className="space-y-[1.6cqw] p-[2.5cqw]">
            {lines.map((width, i) => (
              <div
                key={i}
                className="flex gap-[1.2cqw]"
                style={{ paddingLeft: `${(i % 3) * 3}cqw` }}
              >
                <span
                  className="h-[1.4cqw] rounded-full"
                  style={{ width: `${width * 0.35}%`, background: i % 2 ? accent : '#ffffff55' }}
                />
                <span
                  className="h-[1.4cqw] rounded-full bg-white/20"
                  style={{ width: `${width * 0.5}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
