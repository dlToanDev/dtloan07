# dltoan07

Blog MDX + cửa hàng sản phẩm số. Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL/Prisma · tự deploy trên VPS Ubuntu (GCP) với Nginx + PM2.

📋 **Kế hoạch phát triển đầy đủ: [`docs/PLAN.md`](docs/PLAN.md)** — 12 phase, 113 task, mỗi phase có Exit Gate riêng.

## Yêu cầu

- Node.js 22 (`nvm use` — đọc từ `.nvmrc`)
- pnpm 11 (`corepack enable`)

## Bắt đầu

```bash
pnpm install
cp .env.example .env    # điền giá trị; app sẽ crash ngay nếu env sai
pnpm dev                # http://localhost:3000
```

## Scripts

| Lệnh                | Việc                                 |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Dev server                           |
| `pnpm build`        | Production build                     |
| `pnpm start`        | Chạy bản build                       |
| `pnpm lint`         | ESLint (flat config)                 |
| `pnpm typecheck`    | `tsc --noEmit`                       |
| `pnpm format`       | Prettier ghi đè                      |
| `pnpm format:check` | Prettier kiểm tra (CI dùng lệnh này) |
| `pnpm test`         | Unit test (không cần database)       |
| `pnpm test:int`     | Test tích hợp — cần PostgreSQL thật  |

**Database khi phát triển:**

```bash
docker compose up -d postgres   # PostgreSQL 16 ở localhost:5432
pnpm prisma migrate deploy      # tạo bảng
pnpm prisma db seed             # admin@hvpgroup.vn / Admin@123456 + dữ liệu mẫu
```

**Cổng chất lượng** — phải xanh trước khi commit/push:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm build
```

## Route

| Route                                              | Kiểu   | Ghi chú                                                      |
| -------------------------------------------------- | ------ | ------------------------------------------------------------ |
| `/`                                                | static | hero + chuyên mục + bài nổi bật + bài mới                    |
| `/blog`                                            | static | trang 1, `POSTS_PER_PAGE` trong `src/config/blog.ts`         |
| `/blog/page/[page]`                                | SSG    | từ trang 2 — trang 1 luôn là `/blog` để tránh trùng nội dung |
| `/blog/[slug]`                                     | SSG    | TOC sticky, bài liên quan, JSON-LD                           |
| `/tags/[tag]`, `/categories/[category]`            | SSG    | `dynamicParams = false`                                      |
| `/sitemap.xml`, `/robots.txt`, `/rss.xml`          | static |                                                              |
| `/search-index.json`                               | static | index cho search client-side                                 |
| `/opengraph-image`, `/blog/[slug]/opengraph-image` | SSG    | ảnh OG 1200×630 sinh động                                    |

**SEO:** mọi `generateMetadata` đi qua `buildMetadata()` trong `src/lib/seo.ts` — canonical là bắt buộc, không tự viết thẻ meta rời rạc.

## Design system

- **Token màu** khai báo trong `src/app/globals.css` (`@theme` + biến `:root` / `.dark`). Tailwind 4 dùng CSS-first nên **không có `tailwind.config.ts`**.
- Dùng **token ngữ nghĩa** (`bg-background`, `text-muted-foreground`, `border-border`), không dùng `bg-white` / `text-gray-500` — nếu không sẽ vỡ ở dark mode.
- `cn()` trong `src/lib/utils.ts` để gộp class (twMerge khử class xung đột).
- Component dùng chung: `src/components/ui/`. Layout: `src/components/layout/`.
- Nút dạng link: dùng `buttonStyles()` cho `<Link>`, **không** lồng `<a>` trong `<button>`.
- Heading phải đúng thứ tự h1 → h2 → h3 (`<CardTitle as="h2">`), nếu không Lighthouse trừ điểm a11y.

## Viết bài (MDX)

```bash
pnpm new:post "Tiêu đề bài" --category server --tags nginx,vps
```

Bài nằm trong `content/posts/YYYY-MM-<slug>.mdx`. Tên file bỏ tiền tố ngày sẽ thành URL.

**Frontmatter được validate bằng Zod (`src/types/post.ts`) — sai là fail build**, cố ý như vậy để không publish bài thiếu meta. `description` bắt buộc 50–160 ký tự; `category` phải thuộc `server | lap-trinh | devops | database`.

Cú pháp code block:

| Viết                               | Kết quả          |
| ---------------------------------- | ---------------- |
| ` ```bash `                        | syntax highlight |
| ` ```ts showLineNumbers `          | kèm số dòng      |
| ` ```ts {3-5} `                    | tô sáng dòng 3–5 |
| ` ```ts /useState/ `               | tô sáng chữ      |
| ` ```ts title="src/app/page.tsx" ` | tiêu đề file     |
| ` ```diff `                        | màu +/-          |

Component dùng được trong MDX mà không cần import: `<Callout>`, `<Terminal>`, `<FileTree>`.

> ⚠️ **Trong MDX chỉ truyền prop dạng chuỗi thường.** `next-mdx-remote` (RSC) biến mọi prop dạng biểu thức `{...}` thành `undefined` — kể cả chuỗi. Dùng `<FileTree tree="..." />`, không dùng `tree={[...]}`.

## Quy ước

- **Biến môi trường:** khai báo trong `src/config/env.ts` (Zod). Không đọc thẳng `process.env` ở nơi khác. Thiếu/sai biến → app crash lúc khởi động, không chạy nửa vời.
- **Metadata site:** chỉ sửa ở `src/config/site.ts`, không hardcode tên/URL trong component.
- **Alias:** `@/*` → `src/*`.
- **TypeScript strict** + `noUncheckedIndexedAccess` — truy cập mảng/object theo index trả về `T | undefined`, phải xử lý.
- **Pre-commit:** Husky chạy lint-staged (Prettier + ESLint --fix) trên file đã stage.

## Trạng thái

- [x] **P0** — Chuẩn bị & khởi tạo
- [x] **P1** — Design System & Layout
- [x] **P2** — MDX Engine
- [x] **P3** — Trang Blog & SEO
- [ ] **P4** — Deploy lần đầu (Đã chuẩn bị sẵn config Nginx, PM2, script deploy & backup)
- [x] **P5** — Database & Prisma (Supabase PostgreSQL + Prisma 6 LTS)
- [x] **P6** — Auth & Lead Magnet (Auth.js v5 + Magic Link + Double Opt-in Newsletter)
- [x] **P7** — Catalog & Cart (Zustand Cart Store + CartDrawer + Pure Pricing Engine)
- [x] **P8** — Checkout & Webhook (PayOS VietQR + HMAC SHA256 + Idempotent Webhook)
- [x] **P9** — Digital Delivery & Account (Cloudflare R2 Signed URLs + Tra cứu đơn hàng)
- [x] **P10** — Admin & Testing (Dashboard doanh thu, quản lý SP, đơn, license, subscribers + 33 Vitest tests)
- [x] **P11** — Hardening & Launch (Security headers HSTS/CSP, Terms/Privacy, Runbook vận hành)
