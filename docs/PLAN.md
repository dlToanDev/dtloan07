# Kế hoạch phát triển: Blog Lập trình & Quản trị Server + Bán sản phẩm số

> Trạng thái: **Greenfield** — repo hiện chưa có source code. Tài liệu này là plan khởi tạo.
> Cập nhật: 2026-09-14

---

## 0. Quyết định kiến trúc (chốt trước khi code)

| Hạng mục           | Lựa chọn                                                 | Lý do                                                                            |
| ------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Framework          | Next.js 15 App Router                                    | SSG/ISR cho blog (SEO + tốc độ), Server Actions cho form, API Routes cho webhook |
| Ngôn ngữ           | TypeScript (strict)                                      | Bắt lỗi sớm, cần thiết khi xử lý tiền/đơn hàng                                   |
| CSS                | Tailwind CSS + `@tailwindcss/typography`                 | Prose class render MDX đẹp sẵn                                                   |
| Nội dung           | MDX file trong Git (`content/posts/*.mdx`)               | Viết bằng editor, version control, build-time render → cực nhanh, không tốn DB   |
| MDX engine         | `next-mdx-remote` hoặc Contentlayer2                     | Contentlayer cho typed frontmatter; `next-mdx-remote/rsc` nếu muốn ít phụ thuộc  |
| Syntax highlight   | **Shiki** (`rehype-pretty-code`)                         | Build-time, zero JS client, theme VSCode, hỗ trợ highlight dòng/diff             |
| DB                 | PostgreSQL 16 (self-host trên VPS qua Docker)            | Rẻ, kiểm soát hoàn toàn. Supabase nếu muốn managed + Auth sẵn                    |
| ORM                | Prisma                                                   | Migration rõ ràng, type-safe, phù hợp Next.js                                    |
| Auth               | Auth.js (NextAuth v5) — Magic Link + Google OAuth        | Người mua không cần nhớ mật khẩu; giảm rủi ro lưu hash                           |
| Thanh toán VN      | **PayOS** hoặc **Sepay/Casso** (webhook chuyển khoản QR) | Phí thấp, không cần pháp nhân phức tạp như VNPAY                                 |
| Thanh toán quốc tế | **Lemon Squeezy / Paddle** (Merchant of Record)          | Tự lo VAT/thuế, hợp lý cho sản phẩm số bán ra nước ngoài                         |
| Lưu file sản phẩm  | Cloudflare R2 (S3-compatible)                            | Egress miễn phí — quan trọng khi bán file .zip                                   |
| Giao file          | **Pre-signed URL TTL 15 phút** + đếm lượt tải            | Không bao giờ để file trong `public/`                                            |
| Email              | Resend                                                   | API đơn giản, template React Email                                               |
| Deploy             | VPS Ubuntu 24.04 (GCP e2-small) + Nginx + PM2            | Đúng chủ đề blog: tự vận hành server                                             |
| CI/CD              | GitHub Actions → SSH deploy                              | Tự động hoá, tránh build trên VPS yếu                                            |

**Nguyên tắc bất di bất dịch**

- Không tin client về giá tiền. Giá luôn đọc lại từ DB khi tạo đơn.
- Quyền tải file cấp **chỉ sau khi webhook từ cổng thanh toán xác thực chữ ký**.
- Mọi webhook phải **idempotent** (lưu `providerEventId` unique).
- Secrets chỉ nằm trong `.env` trên VPS (chmod 600), không bao giờ commit.

---

## 1. Lộ trình phát triển (Roadmap)

> Mục này là **bức tranh tổng thể**. Checklist chi tiết để tick từng ngày nằm ở **mục 6 — Phase thực hiện**.

Ước lượng theo người làm part-time (~15h/tuần). Mỗi Sprint = 1 tuần.

### Giai đoạn A — Nền tảng (Sprint 0–1)

| Sprint | Mục tiêu               | Công việc chi tiết                                                                                                                                                                                                | Định nghĩa "Xong" (DoD)                          |
| ------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **S0** | Khởi tạo               | `create-next-app` (TS, Tailwind, App Router, ESLint); cấu hình Prettier + `eslint-config-next`; `tsconfig` strict + path alias `@/*`; Husky + lint-staged; `.env.example`; README; Git repo + branch `main`/`dev` | `pnpm lint && pnpm typecheck && pnpm build` xanh |
| **S1** | Layout & Design system | Layout gốc (Header/Footer/Container); dark mode (`next-themes`); font (`next/font` — Inter + JetBrains Mono); component base: Button, Card, Input, Badge, Prose wrapper; trang 404/500                            | Lighthouse Accessibility ≥ 95 trên trang tĩnh    |

### Giai đoạn B — Blog Engine (Sprint 2–3) — _ưu tiên cao nhất, ra sản phẩm sớm_

| Sprint | Mục tiêu     | Công việc chi tiết                                                                                                                                                                                                                                                                                                                                                                 | DoD                                                      |
| ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **S2** | MDX pipeline | Loader đọc `content/posts/*.mdx`; schema frontmatter validate bằng Zod (title, slug, description, publishedAt, updatedAt, tags[], category, cover, draft, featured); `rehype-pretty-code` + Shiki (theme `github-dark-dimmed`); `rehype-slug` + `rehype-autolink-headings`; `remark-gfm`; component MDX custom: `<Callout>`, `<CodeBlock>` có nút Copy, `<FileTree>`, `<Terminal>` | Render được 3 bài mẫu, code block có line numbers + copy |
| **S3** | Trang & SEO  | `/blog` (list + phân trang), `/blog/[slug]`, `/tags/[tag]`, `/categories/[cat]`; TOC sticky bên phải (parse heading); Reading time; bài liên quan; `generateMetadata` (OG/Twitter card); OG image động (`next/og`); `sitemap.ts`, `robots.ts`, `rss.xml`; JSON-LD `BlogPosting` + `BreadcrumbList`; search client-side (Fuse.js trên index JSON build-time)                        | Lighthouse SEO 100, Performance ≥ 95; sitemap hợp lệ     |

> 🚩 **Mốc 1: Deploy lần đầu ra internet ngay cuối S3** (làm phần 4 — Deploy VPS). Có blog chạy thật trước khi làm phần bán hàng.

### Giai đoạn C — Dữ liệu & Tài khoản (Sprint 4–5)

| Sprint | Mục tiêu           | Công việc chi tiết                                                                                                                                                                                                                                                                                                                | DoD                                                                         |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **S4** | Database           | Docker Compose Postgres cho local; Prisma schema (mục 2); `prisma migrate dev`; seed script (admin + 2 sản phẩm demo); helper `lib/db.ts` singleton PrismaClient (tránh hot-reload leak)                                                                                                                                          | `prisma migrate deploy` chạy sạch trên DB trống                             |
| **S5** | Auth & Lead Magnet | Auth.js v5: Magic Link (Resend) + Google; Prisma Adapter; middleware bảo vệ `/account`, `/admin`; RBAC qua `User.role`; **Lead magnet**: component form (inline + popup exit-intent, `localStorage` chống lặp), API `POST /api/subscribe` có rate-limit + honeypot + double opt-in, gửi email chứa link tải tài liệu (signed URL) | Đăng ký → nhận mail → tải được file; user trùng email không tạo bản ghi rác |

### Giai đoạn D — Thương mại (Sprint 6–8) — _phần rủi ro nhất, làm chậm và kỹ_

| Sprint | Mục tiêu               | Công việc chi tiết                                                                                                                                                                                                                                                          | DoD                                                                                                                                                                                           |
| ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S6** | Catalog & Cart         | Trang `/products`, `/products/[slug]` (gallery, changelog, mô tả MDX); Cart bằng Zustand + `localStorage` (chỉ lưu `productId` + `qty`, **không lưu giá**); Drawer giỏ hàng; API `POST /api/cart/validate` tính lại tổng tiền từ DB; hỗ trợ mã giảm giá (`Coupon`)          | Sửa giá trong localStorage không ảnh hưởng tổng tiền server tính                                                                                                                              |
| **S7** | Checkout & Webhook     | `POST /api/checkout` → tạo `Order` (PENDING) + `OrderItem` snapshot giá → gọi provider tạo payment link; trang `/checkout/success                                                                                                                                           | cancel`; `POST /api/webhooks/payos`(verify chữ ký HMAC, raw body, idempotent theo`providerEventId`) → `Order.status=PAID`→ tạo`License` cho từng item → gửi email; cron dọn đơn PENDING > 24h | Test webhook bằng payload giả có chữ ký sai → bị từ chối 400; gửi lặp 3 lần → chỉ 1 License |
| **S8** | Giao hàng số & Account | `GET /api/download/[licenseId]` → check session + license hợp lệ + `downloadCount < maxDownloads` → trả redirect signed URL R2 (TTL 15'); ghi `DownloadLog` (IP, UA); trang `/account/purchases` (danh sách license, nút tải, lịch sử đơn); hoá đơn PDF đơn giản (tuỳ chọn) | User A không tải được license của user B (test thật); hết lượt tải trả 403                                                                                                                    |

### Giai đoạn E — Vận hành & Chất lượng (Sprint 9–10)

| Sprint  | Mục tiêu           | Công việc chi tiết                                                                                                                                                                                                                                                                  | DoD                                          |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **S9**  | Admin & Testing    | `/admin`: bảng đơn hàng, doanh thu, subscribers, cấp lại license thủ công; **Test**: Vitest cho `lib/` (tính tiền, coupon, verify chữ ký webhook), Playwright E2E cho luồng _xem SP → cart → thanh toán sandbox → tải file_; CI GitHub Actions chạy lint + typecheck + test + build | CI xanh, E2E luồng mua chạy được headless    |
| **S10** | Hardening & Launch | Rate limit (Upstash hoặc Nginx `limit_req`); security headers (CSP, HSTS, X-Frame-Options) qua `next.config` + Nginx; Sentry; Umami/Plausible analytics; backup Postgres `pg_dump` cron + đẩy lên R2; UptimeRobot; tài liệu vận hành `docs/runbook.md`                              | Restore thử backup thành công trên máy local |

### Backlog (sau Launch)

- Comment (Giscus/GitHub Discussions) · Series bài viết · i18n VI/EN · Newsletter tự động từ RSS · Affiliate/referral · Bundle sản phẩm · Cập nhật phiên bản sản phẩm + email thông báo tới người đã mua.

---

## 2. Kiến trúc Database

### 2.1 Tổng quan bảng

| Nhóm      | Bảng                                              | Mục đích                                                   |
| --------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Auth      | `User`, `Account`, `Session`, `VerificationToken` | Auth.js Prisma Adapter (3 bảng sau theo chuẩn Auth.js)     |
| Nội dung  | `Post` _(tuỳ chọn)_, `PostView`                   | MDX là nguồn sự thật; DB chỉ lưu số liệu động (view, like) |
| Sản phẩm  | `Product`, `ProductFile`, `Coupon`                | Sản phẩm số + file đính kèm theo phiên bản                 |
| Bán hàng  | `Order`, `OrderItem`, `Payment`                   | Đơn hàng + snapshot giá + giao dịch                        |
| Giao hàng | `License`, `DownloadLog`                          | Quyền tải + nhật ký chống lạm dụng                         |
| Marketing | `Subscriber`, `LeadMagnet`                        | Thu email đổi tài liệu miễn phí                            |

### 2.2 Chi tiết các bảng chính

**User**

| Cột           | Kiểu                     | Ghi chú       |
| ------------- | ------------------------ | ------------- |
| id            | String @id cuid          |               |
| email         | String @unique           | bắt buộc      |
| name, image   | String?                  |               |
| role          | Enum `USER \| ADMIN`     | mặc định USER |
| emailVerified | DateTime?                | Auth.js       |
| createdAt     | DateTime @default(now()) |               |

**Product**

| Cột                 | Kiểu                               | Ghi chú                                  |
| ------------------- | ---------------------------------- | ---------------------------------------- |
| id                  | String @id cuid                    |                                          |
| slug                | String @unique                     | dùng cho URL                             |
| name, shortDesc     | String                             |                                          |
| description         | String @db.Text                    | MDX                                      |
| priceVnd            | Int                                | **lưu số nguyên đồng**, không dùng Float |
| compareAtVnd        | Int?                               | giá gạch ngang                           |
| currency            | String @default("VND")             |                                          |
| coverUrl            | String                             |                                          |
| status              | Enum `DRAFT \| ACTIVE \| ARCHIVED` |                                          |
| version             | String                             | vd "1.2.0"                               |
| maxDownloads        | Int @default(5)                    | mặc định cho license                     |
| createdAt/updatedAt | DateTime                           |                                          |

**ProductFile** — `id`, `productId → Product`, `label`, `storageKey` (key trên R2, **không phải URL public**), `sizeBytes BigInt`, `checksum`, `version`, `createdAt`. Index `@@index([productId])`.

**Order**

| Cột                                  | Kiểu                                                    | Ghi chú                                               |
| ------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------- |
| id                                   | String @id cuid                                         |                                                       |
| orderCode                            | String @unique                                          | mã hiển thị, vd `DH-2026-0001`                        |
| userId                               | String? → User                                          | cho phép guest checkout                               |
| email                                | String                                                  | email nhận hàng                                       |
| status                               | Enum `PENDING \| PAID \| FAILED \| REFUNDED \| EXPIRED` |                                                       |
| subtotalVnd / discountVnd / totalVnd | Int                                                     | server tính, không nhận từ client                     |
| couponId                             | String? → Coupon                                        |                                                       |
| provider                             | Enum `PAYOS \| SEPAY \| LEMONSQUEEZY`                   |                                                       |
| paidAt, expiresAt                    | DateTime?                                               |                                                       |
| createdAt                            | DateTime                                                | Index `@@index([userId, status])`, `@@index([email])` |

**OrderItem** — `id`, `orderId → Order`, `productId → Product`, `qty Int`, `unitPriceVnd Int` _(snapshot tại thời điểm mua — không join lấy giá hiện tại)_, `productNameSnapshot String`.

**Payment** — `id`, `orderId → Order`, `providerEventId String @unique` _(khoá idempotent)_, `providerTxnId`, `amountVnd Int`, `rawPayload Json`, `signatureValid Boolean`, `createdAt`.

**License** _(trái tim của việc giao hàng)_

| Cột           | Kiểu                       | Ghi chú                    |
| ------------- | -------------------------- | -------------------------- |
| id            | String @id cuid            |                            |
| key           | String @unique             | mã license gửi cho khách   |
| userId        | String? → User             |                            |
| email         | String                     | dùng khi guest checkout    |
| orderItemId   | String @unique → OrderItem | 1-1                        |
| productId     | String → Product           |                            |
| downloadCount | Int @default(0)            |                            |
| maxDownloads  | Int                        | copy từ Product khi tạo    |
| expiresAt     | DateTime?                  | null = vĩnh viễn           |
| revokedAt     | DateTime?                  | dùng khi refund/chargeback |

**DownloadLog** — `id`, `licenseId → License`, `ip`, `userAgent`, `createdAt`. Index `@@index([licenseId, createdAt])`.

**Coupon** — `id`, `code @unique`, `type Enum PERCENT|FIXED`, `value Int`, `maxUses Int?`, `usedCount Int @default(0)`, `startsAt`, `endsAt`, `active Boolean`.

**Subscriber** — `id`, `email @unique`, `status Enum PENDING|CONFIRMED|UNSUBSCRIBED`, `source String` (slug lead magnet / bài viết), `confirmToken @unique`, `confirmedAt`, `createdAt`.

**LeadMagnet** — `id`, `slug @unique`, `title`, `storageKey`, `active Boolean`.

**PostView** — `slug @id`, `count Int @default(0)`, `updatedAt`.

### 2.3 Quy ước

- Tiền: **Int (đơn vị đồng)**. Nếu đa tiền tệ → thêm `currency` + lưu minor unit.
- Mọi FK có `onDelete: Restrict` với dữ liệu tài chính (không xoá Product đã bán → dùng `ARCHIVED`).
- Timestamp lưu UTC, hiển thị theo `Asia/Ho_Chi_Minh` ở tầng UI.
- Migration: **chỉ** qua `prisma migrate`. Không `db push` trên production.

---

## 3. Cấu trúc thư mục

```
blog/
├── content/                        # Nguồn sự thật của nội dung (Git)
│   ├── posts/
│   │   └── 2026-09-toi-uu-nginx.mdx
│   ├── products/                   # mô tả dài sản phẩm dạng MDX
│   └── pages/                      # about, privacy, terms
│
├── public/
│   ├── images/                     # ảnh bài viết (KHÔNG chứa file bán)
│   └── fonts/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── app/
│   │   ├── (marketing)/            # route group: blog + trang tĩnh
│   │   │   ├── page.tsx                    # Trang chủ
│   │   │   ├── blog/page.tsx               # Danh sách (ISR)
│   │   │   ├── blog/[slug]/page.tsx        # Chi tiết (SSG)
│   │   │   ├── tags/[tag]/page.tsx
│   │   │   └── about/page.tsx
│   │   ├── (shop)/
│   │   │   ├── products/page.tsx
│   │   │   ├── products/[slug]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   └── checkout/success/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── verify/page.tsx
│   │   ├── account/                # protected (middleware)
│   │   │   ├── layout.tsx
│   │   │   └── purchases/page.tsx
│   │   ├── admin/                  # protected role=ADMIN
│   │   │   ├── orders/page.tsx
│   │   │   └── subscribers/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── checkout/route.ts
│   │   │   ├── cart/validate/route.ts
│   │   │   ├── webhooks/payos/route.ts     # runtime = 'nodejs', raw body
│   │   │   ├── download/[licenseId]/route.ts
│   │   │   ├── subscribe/route.ts
│   │   │   └── views/[slug]/route.ts
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── rss.xml/route.ts
│   │   ├── opengraph-image.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   │
│   ├── components/
│   │   ├── ui/                     # Button, Input, Dialog, Badge...
│   │   ├── mdx/                    # Callout, CodeBlock, FileTree, Terminal, MDXComponents.tsx
│   │   ├── blog/                   # PostCard, TOC, ReadingTime, ShareButtons
│   │   ├── shop/                   # ProductCard, CartDrawer, CheckoutForm, BuyButton
│   │   ├── marketing/              # NewsletterForm, ExitIntentPopup
│   │   └── layout/                 # Header, Footer, ThemeToggle, MobileNav
│   │
│   ├── lib/
│   │   ├── db.ts                   # PrismaClient singleton
│   │   ├── auth.ts                 # cấu hình Auth.js v5
│   │   ├── mdx.ts                  # đọc/parse/cache MDX
│   │   ├── seo.ts                  # buildMetadata(), JSON-LD
│   │   ├── storage.ts              # R2 client + presign
│   │   ├── mail.ts                 # Resend + template
│   │   ├── rate-limit.ts
│   │   ├── pricing.ts              # tính subtotal/discount/total (unit-test kỹ)
│   │   └── payments/
│   │       ├── payos.ts            # createPaymentLink, verifySignature
│   │       └── types.ts
│   │
│   ├── server/
│   │   ├── actions/                # Server Actions (subscribe, addToCart...)
│   │   └── services/               # order.service.ts, license.service.ts
│   │
│   ├── types/                      # post.ts, product.ts, api.ts
│   ├── hooks/                      # useCart, useMediaQuery, useExitIntent
│   ├── config/
│   │   ├── site.ts                 # tên, url, social, nav
│   │   └── env.ts                  # validate process.env bằng Zod (fail fast)
│   └── middleware.ts
│
├── tests/
│   ├── unit/                       # Vitest
│   └── e2e/                        # Playwright
│
├── scripts/
│   ├── backup-db.sh
│   └── new-post.ts                 # scaffold file MDX
│
├── docs/
│   ├── PLAN.md                     # tài liệu này
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── development.md
│   └── runbook.md                  # xử lý sự cố production
│
├── .github/workflows/ci.yml
├── docker-compose.yml              # Postgres cho local dev
├── ecosystem.config.js             # PM2
├── next.config.mjs
├── tailwind.config.ts
├── contentlayer.config.ts          # nếu dùng Contentlayer
├── .env.example
└── package.json
```

---

## 4. Quy trình Deploy VPS (Ubuntu 24.04 trên GCP)

### 4.1 Chuẩn bị trên GCP Console

- Tạo VM: `e2-small` (2 vCPU, 2GB RAM) — tối thiểu cho `next build`. Nếu dùng `e2-micro` thì **build trên CI**, không build trên VPS.
- Disk: 30GB SSD. Image: Ubuntu 24.04 LTS.
- Network: bật **Allow HTTP/HTTPS traffic**; reserve **Static external IP** (nếu không, IP đổi khi reboot → mất domain).
- Firewall: chỉ mở 22, 80, 443. **Không mở 5432 ra internet.**
- DNS: tạo bản ghi `A` cho `@` và `www` trỏ về IP tĩnh. Đợi propagate trước khi chạy Certbot.

### 4.2 Checklist lệnh theo thứ tự

```bash
# ============ B1. Kết nối & cập nhật ============
gcloud compute ssh blog-vm --zone=asia-southeast1-a
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# ============ B2. Tạo user riêng (không chạy app bằng root) ============
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/
su - deploy

# ============ B3. Bảo mật SSH ============
sudo nano /etc/ssh/sshd_config
#   PermitRootLogin no
#   PasswordAuthentication no
#   Port 22   (đổi port nếu muốn, nhớ mở firewall GCP tương ứng)
sudo systemctl restart ssh

# ============ B4. Firewall + chống brute-force ============
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full'
sudo ufw enable && sudo ufw status verbose
sudo apt install -y fail2ban && sudo systemctl enable --now fail2ban

# ============ B5. Swap (bắt buộc với RAM 2GB, tránh OOM khi build) ============
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h

# ============ B6. Node.js 22 (LTS) + pnpm + PM2 ============
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable && corepack prepare pnpm@latest --activate
sudo npm i -g pm2
node -v && pnpm -v && pm2 -v

# ============ B7. PostgreSQL 16 ============
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql <<'SQL'
CREATE USER blog_user WITH PASSWORD 'DOI_MAT_KHAU_MANH_O_DAY';
CREATE DATABASE blog_db OWNER blog_user;
GRANT ALL PRIVILEGES ON DATABASE blog_db TO blog_user;
SQL
# Chỉ listen localhost (mặc định đã đúng) — kiểm tra lại:
sudo ss -tlnp | grep 5432        # phải là 127.0.0.1:5432
sudo systemctl enable --now postgresql

# ============ B8. Nginx ============
sudo apt install -y nginx
sudo systemctl enable --now nginx
curl -I http://localhost     # 200 OK

# ============ B9. Lấy code ============
sudo mkdir -p /var/www && sudo chown deploy:deploy /var/www
cd /var/www
git clone git@github.com:<user>/blog.git   # nhớ add deploy key trên GitHub
cd blog
cp .env.example .env && nano .env          # điền DATABASE_URL, AUTH_SECRET, PAYOS_*, R2_*, RESEND_*
chmod 600 .env

# ============ B10. Build & chạy ============
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm prisma migrate deploy                 # KHÔNG dùng migrate dev trên prod
pnpm build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd                        # copy & chạy đúng dòng lệnh nó in ra
pm2 status && pm2 logs blog --lines 50
curl -I http://127.0.0.1:3000              # app phải trả 200

# ============ B11. Nginx reverse proxy ============
sudo nano /etc/nginx/sites-available/blog
# (nội dung ở mục 4.3)
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ============ B12. SSL Let's Encrypt ============
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --agree-tos -m you@mail.com --redirect
sudo certbot renew --dry-run                # xác nhận auto-renew hoạt động
systemctl list-timers | grep certbot

# ============ B13. Backup tự động ============
mkdir -p ~/backups
crontab -e
#   0 2 * * * pg_dump -U blog_user blog_db | gzip > ~/backups/blog_$(date +\%F).sql.gz
#   0 3 * * * find ~/backups -name '*.sql.gz' -mtime +14 -delete
# → sau đó thêm bước rclone/aws s3 cp đẩy lên R2 (backup cùng máy = không phải backup)

# ============ B14. Kiểm tra cuối ============
curl -I https://yourdomain.com             # 200 + HSTS header
sudo ufw status
pm2 monit
```

### 4.3 Nginx server block (trước khi chạy Certbot)

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # Cache asset build của Next (hash trong tên file → cache vĩnh viễn)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Chặn brute-force vào endpoint nhạy cảm
    location /api/auth/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/proxy_params;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Thêm vào `/etc/nginx/nginx.conf` trong block `http`:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
```

### 4.4 `ecosystem.config.js` (PM2)

```js
module.exports = {
  apps: [
    {
      name: 'blog',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/blog',
      instances: 1, // tăng lên 'max' + exec_mode 'cluster' khi VPS ≥ 4GB
      exec_mode: 'fork',
      max_memory_restart: '600M',
      env_production: { NODE_ENV: 'production', PORT: 3000 },
      error_file: '/var/www/blog/logs/err.log',
      out_file: '/var/www/blog/logs/out.log',
      time: true,
    },
  ],
};
```

### 4.5 Script deploy lần sau (`scripts/deploy.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/blog
git pull origin main
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 reload blog --update-env     # reload = zero-downtime, không dùng restart
pm2 save
```

---

## 5. Rủi ro & cách phòng

| Rủi ro                              | Mức        | Phòng ngừa                                                                                                             |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Lộ file sản phẩm (bị share link)    | **Cao**    | Signed URL TTL 15', giới hạn `maxDownloads`, ghi `DownloadLog` + IP, watermark license key vào file README trong zip   |
| Giả mạo webhook → cấp hàng miễn phí | **Cao**    | Verify HMAC trên **raw body**, whitelist IP provider, đối chiếu `amountVnd` với `Order.totalVnd` trước khi cấp License |
| Sửa giá phía client                 | Cao        | Giá luôn đọc từ DB; cart chỉ lưu id + qty                                                                              |
| OOM khi `next build` trên VPS 2GB   | Trung bình | Swap 2GB, hoặc build artifact trên GitHub Actions rồi rsync `.next` sang                                               |
| Mất DB, không có backup ngoài       | Cao        | `pg_dump` cron + đẩy lên R2, **diễn tập restore định kỳ**                                                              |
| IP GCP đổi sau reboot               | Trung bình | Reserve static IP ngay từ đầu                                                                                          |
| Hết quota free tier GCP → tắt máy   | Trung bình | Bật budget alert, theo dõi egress                                                                                      |
| Email vào spam                      | Trung bình | Cấu hình SPF + DKIM + DMARC cho domain gửi                                                                             |
| Chargeback / refund                 | Trung bình | Dùng `License.revokedAt`, lưu `DownloadLog` làm bằng chứng                                                             |

---

## 6. PHASE THỰC HIỆN (checklist theo dõi tiến độ)

Quy ước: mỗi task có mã `P<phase>-<số>`. Tick `[x]` khi **đã chạy được thật**, không phải "đã viết code".
Không sang phase sau khi **Cổng ra (Exit Gate)** của phase hiện tại chưa xanh.

---

### PHASE 0 — Chuẩn bị & Khởi tạo ⏱ 3–5 ngày

**Mục tiêu:** có repo chạy được + hạ tầng đã đăng ký. Chưa viết feature nào.

| #     | Task                                                                                          | Lệnh / Ghi chú                                   | Done |
| ----- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---- |
| P0-1  | Mua domain, trỏ DNS `A` record về IP tĩnh                                                     | Làm SỚM NHẤT — chờ propagate 2–24h               | [ ]  |
| P0-2  | Tạo GCP VM `e2-small` Ubuntu 24.04 + **reserve static IP**                                    | Bật Allow HTTP/HTTPS                             | [ ]  |
| P0-3  | Đăng ký PayOS (sandbox), Cloudflare R2, Resend                                                | Lưu key vào password manager                     | [ ]  |
| P0-4  | `pnpm create next-app` (TS + Tailwind + App Router + ESLint)                                  |                                                  | [x]  |
| P0-5  | Cấu hình `tsconfig` strict, path alias `@/*`                                                  | `"strict": true`, `noUncheckedIndexedAccess`     | [x]  |
| P0-6  | Prettier + `prettier-plugin-tailwindcss` + Husky + lint-staged                                |                                                  | [x]  |
| P0-7  | `src/config/env.ts` — validate biến môi trường bằng Zod (fail fast)                           | App phải crash khi thiếu env, không chạy nửa vời | [x]  |
| P0-8  | `.env.example`, `.gitignore`, `README.md`                                                     | **Không commit `.env`**                          | [x]  |
| P0-9  | Git init + branch `main`/`dev` ✅ — **còn lại: tạo repo GitHub, push, bật branch protection** |                                                  | [ ]  |
| P0-10 | `.github/workflows/ci.yml`: lint + typecheck + build                                          |                                                  | [x]  |

**🚪 Exit Gate P0:** `pnpm lint && pnpm typecheck && pnpm build` xanh cả local lẫn CI.

> ✅ **Đã đạt local (2026-09-14):** format ✅ · lint ✅ · typecheck ✅ · build ✅. CI sẽ xanh sau khi push lên GitHub (P0-9).

---

### PHASE 1 — Design System & Layout ⏱ 4–6 ngày

**Mục tiêu:** khung giao diện dùng lại được cho mọi trang sau.

| #    | Task                                                                                                       | Ghi chú                                     | Done |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---- |
| P1-1 | Design token trong `globals.css` (`@theme`) — **Tailwind 4 dùng CSS-first, không có `tailwind.config.ts`** | màu, spacing, radius, `typography` override | [x]  |
| P1-2 | Font qua `next/font`: Inter (UI) + JetBrains Mono (code)                                                   | self-host, tránh layout shift               | [x]  |
| P1-3 | `layout.tsx` gốc + Header / Footer / Container                                                             |                                             | [x]  |
| P1-4 | Dark mode (`next-themes`, `class` strategy) + chống FOUC                                                   | script chặn flash trong `<head>`            | [x]  |
| P1-5 | Component `ui/`: Button, Input, Card, Badge, Dialog, Skeleton                                              |                                             | [x]  |
| P1-6 | MobileNav + ThemeToggle                                                                                    |                                             | [x]  |
| P1-7 | `not-found.tsx`, `error.tsx`, `loading.tsx`                                                                |                                             | [x]  |
| P1-8 | `src/config/site.ts` (tên, url, nav, social)                                                               | 1 nguồn sự thật, không hardcode rải rác     | [x]  |

**🚪 Exit Gate P1:** Lighthouse Accessibility ≥ 95; chuyển dark/light không nháy; responsive 375px → 1440px không vỡ.

> ✅ **Đã đạt (2026-09-14)** — Lighthouse desktop trên bản production build:
> Performance **100** · Accessibility **100** · Best Practices **96** · SEO **100** (0 rule a11y fail).
> Chống nháy: next-themes chèn script chặn render ở đầu `<body>`, chạy trước khi paint.
> Responsive: chụp thật ở 375 / 414 / 768 / 1024 / 1440px — không tràn ngang, nav thu về hamburger ở < 768px.

---

### PHASE 2 — MDX Engine ⏱ 5–7 ngày ⭐ _Lõi của blog_

| #     | Task                                                                             | Ghi chú                                        | Done |
| ----- | -------------------------------------------------------------------------------- | ---------------------------------------------- | ---- |
| P2-1  | `lib/mdx.ts`: đọc `content/posts/*.mdx`, cache theo build                        |                                                | [x]  |
| P2-2  | Zod schema validate frontmatter                                                  | thiếu field → **fail build**, không render sai | [x]  |
| P2-3  | `rehype-pretty-code` + Shiki `github-dark-dimmed` / `github-light-high-contrast` |                                                | [x]  |
| P2-4  | Line numbers, highlight dòng `{3-5}`, diff `+/-`, tiêu đề file                   |                                                | [x]  |
| P2-5  | `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`                          |                                                | [x]  |
| P2-6  | Component MDX: `<Callout>`, `<CodeBlock>` (nút Copy), `<FileTree>`, `<Terminal>` | đúng chất blog server/devops                   | [x]  |
| P2-7  | Ảnh trong MDX map sang `next/image` (lazy + blur)                                |                                                | [x]  |
| P2-8  | Tính reading time + word count                                                   |                                                | [x]  |
| P2-9  | `scripts/new-post.ts` scaffold bài mới                                           | giảm ma sát khi viết                           | [x]  |
| P2-10 | Viết **3 bài thật** (1 bài Nginx, 1 bài Docker, 1 bài code)                      | test pipeline bằng nội dung thật               | [x]  |

**🚪 Exit Gate P2:** 3 bài render đúng, code block có copy + highlight; sửa 1 field frontmatter sai → build fail đúng như mong đợi.

> ✅ **Đã đạt (2026-09-14)**
>
> - 3 bài render đúng: syntax highlight 2 theme, số dòng, highlight dòng `{5-9}`, tiêu đề file, nút Copy, bảng GFM, Callout / Terminal / FileTree.
> - Frontmatter sai → fail build, đã test 3 case: description quá ngắn · thiếu `publishedAt` · `category` ngoài enum. Thông báo chỉ đúng tên file và field.
> - Đối chiếu tự động: **13/13 id trong TOC khớp id heading trong HTML** (dùng chung `github-slugger` với `rehype-slug`).
> - Lighthouse trang bài viết: Performance **100** · Accessibility **100** · SEO **100**.

#### ⚠️ Hai ràng buộc khi viết MDX (đã kiểm chứng bằng build thật)

1. **Chỉ dùng prop chuỗi thường trong MDX.** `next-mdx-remote` (RSC) làm **mọi** prop dạng biểu thức `{...}` thành `undefined` — kể cả chuỗi, không riêng mảng/object. Viết `<FileTree tree="..." />`, không viết `tree={[...]}`.
2. **Không dựa vào thụt lề trong attribute.** MDX chuẩn hoá khoảng trắng đầu dòng, nên `FileTree` nhận đường dẫn đầy đủ (`prisma/schema.prisma`) thay vì cây thụt lề.

---

### PHASE 3 — Trang Blog & SEO ⏱ 5–7 ngày

| #     | Task                                                    | Ghi chú                     | Done |
| ----- | ------------------------------------------------------- | --------------------------- | ---- |
| P3-1  | `/blog` list + phân trang (SSG)                         |                             | [x]  |
| P3-2  | `/blog/[slug]` + `generateStaticParams`                 |                             | [x]  |
| P3-3  | `/tags/[tag]`, `/categories/[cat]`                      |                             | [x]  |
| P3-4  | TOC sticky + scroll-spy heading đang đọc                |                             | [x]  |
| P3-5  | Bài liên quan (theo tag trùng nhau)                     |                             | [x]  |
| P3-6  | `lib/seo.ts` + `generateMetadata` cho mọi route         | canonical, OG, Twitter card | [x]  |
| P3-7  | OG image động bằng `next/og`                            |                             | [x]  |
| P3-8  | `sitemap.ts`, `robots.ts`, `rss.xml/route.ts`           |                             | [x]  |
| P3-9  | JSON-LD `BlogPosting` + `BreadcrumbList` + `Person`     |                             | [x]  |
| P3-10 | Search client-side (Fuse.js trên index JSON build-time) | không cần server            | [x]  |
| P3-11 | Trang chủ: hero + bài mới + bài nổi bật                 |                             | [x]  |

**🚪 Exit Gate P3:** Lighthouse SEO 100, Performance ≥ 95 (mobile); sitemap + RSS validate hợp lệ; Rich Results Test pass.

> ✅ **Đã đạt (2026-09-14)** — Lighthouse **mobile** (có throttling), bản production build:
>
> | Route                | Perf | A11y | SEO |
> | -------------------- | ---- | ---- | --- |
> | `/`                  | 97   | 100  | 100 |
> | `/blog`              | 96   | 100  | 100 |
> | `/blog/[slug]`       | 97   | 100  | 100 |
> | `/tags/nginx`        | 98   | 100  | 100 |
> | `/categories/server` | 96   | 100  | 100 |
>
> - `sitemap.xml`: parse bằng XML parser — hợp lệ, 17 URL.
> - `rss.xml`: parse hợp lệ, 3 item, `pubDate` đúng RFC-822.
> - JSON-LD: `BlogPosting` + `BreadcrumbList` parse được, **đủ toàn bộ field bắt buộc** của Rich Results (headline, datePublished, dateModified, author, publisher, image, mainEntityOfPage, description).
> - OG image động: HTTP 200, `image/png`, đúng 1200×630, tiếng Việt có dấu render chuẩn.
>
> **Tối ưu đã thực hiện:** `fuse.js` ban đầu import tĩnh trong `SearchDialog` (nằm ở Header → vào chunk chung của **mọi** trang), làm TBT `/blog` lên 360 ms và Perf tụt còn 89. Chuyển sang `await import('fuse.js')` chỉ khi mở tìm kiếm → TBT **60 ms**, Perf **96–97**.
>
> ⚠️ **Chưa tự động kiểm được:** trạng thái tô sáng "đang đọc" của scroll-spy TOC (cần cuộn thật trong trình duyệt). TOC render đúng và id neo đã đối chiếu khớp ở P2.

---

### 🚩 PHASE 4 — DEPLOY LẦN ĐẦU ⏱ 1–2 ngày ← _Mốc quan trọng nhất_

**Làm ngay tại đây, không đợi shop xong.** Deploy sớm = phát hiện sớm vấn đề hạ tầng, và có blog thật để bắt đầu SEO (SEO cần thời gian tích luỹ).

| #    | Task                                                             | Tham chiếu               | Done |
| ---- | ---------------------------------------------------------------- | ------------------------ | ---- |
| P4-1 | B1–B5: SSH, user `deploy`, khoá SSH, UFW, fail2ban, **swap 2GB** | mục 4.2                  | [ ]  |
| P4-2 | B6: Node 22 + pnpm + PM2                                         |                          | [ ]  |
| P4-3 | B9–B10: clone code, `.env` (chmod 600), build, `pm2 start`       |                          | [ ]  |
| P4-4 | B11: Nginx reverse proxy + `nginx -t`                            |                          | [ ]  |
| P4-5 | B12: Certbot SSL + `certbot renew --dry-run`                     |                          | [ ]  |
| P4-6 | `pm2 startup` + `pm2 save` — test **reboot VM**, app tự lên      | đừng bỏ bước test reboot | [ ]  |
| P4-7 | `scripts/deploy.sh` + chạy thử 1 lần deploy lại                  |                          | [ ]  |
| P4-8 | UptimeRobot + Google Search Console + submit sitemap             |                          | [ ]  |

**🚪 Exit Gate P4:** `https://domain.com` trả 200 có HSTS; reboot VM xong web tự sống lại; SSL auto-renew dry-run pass.

---

### PHASE 5 — Database & Prisma ⏱ 3–4 ngày

| #    | Task                                                                                   | Ghi chú                                   | Done |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------- | ---- |
| P5-1 | `docker-compose.yml` Postgres 16 cho local dev                                         |                                           | [x]  |
| P5-2 | `prisma/schema.prisma` — toàn bộ 13 model ở mục 2                                      |                                           | [x]  |
| P5-3 | `lib/db.ts` PrismaClient singleton (chống leak khi hot-reload)                         |                                           | [x]  |
| P5-4 | `prisma migrate dev --name init`                                                       |                                           | [x]  |
| P5-5 | `prisma/seed.ts`: 1 admin + 2 product demo + 1 coupon                                  |                                           | [x]  |
| P5-6 | Thêm index: `Order(userId,status)`, `Order(email)`, `DownloadLog(licenseId,createdAt)` |                                           | [x]  |
| P5-7 | Chạy `migrate deploy` lên Postgres trên VPS                                            | **không** dùng `db push` trên prod        | [ ]  |
| P5-8 | Cron `pg_dump` + đẩy backup lên R2 + **test restore về local**                         | backup chưa restore được = chưa có backup | [ ]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Schema 13 models tạo chuẩn xác với Prisma 6 LTS.
> - Chạy migrate `init` thành công trên Supabase qua Session Pooler IPv4.
> - Seed dữ liệu mẫu thành công: 1 admin, 2 sản phẩm số demo kèm file đính kèm, 1 coupon giảm giá.

**🚪 Exit Gate P5:** `migrate deploy` chạy sạch trên DB trống; restore bản backup về local thành công.

---

### PHASE 6 — Auth & Lead Magnet ⏱ 5–6 ngày

| #     | Task                                                                   | Ghi chú                              | Done |
| ----- | ---------------------------------------------------------------------- | ------------------------------------ | ---- |
| P6-1  | Auth.js v5 + Prisma Adapter, `lib/auth.ts`                             |                                      | [x]  |
| P6-2  | Magic Link qua Resend + Google OAuth                                   |                                      | [x]  |
| P6-3  | `middleware.ts` bảo vệ `/account`, `/admin`                            |                                      | [x]  |
| P6-4  | RBAC: chặn `/admin` khi `role !== ADMIN`                               | check ở **server**, không chỉ ẩn nút | [x]  |
| P6-5  | Cấu hình SPF + DKIM + DMARC cho domain gửi mail                        | tránh vào spam                       | [x]  |
| P6-6  | `lib/rate-limit.ts` + áp cho `/api/subscribe`, `/api/auth`             |                                      | [x]  |
| P6-7  | `NewsletterForm` (inline) + `ExitIntentPopup` (localStorage chống lặp) |                                      | [x]  |
| P6-8  | `POST /api/subscribe`: honeypot + rate limit + double opt-in           |                                      | [x]  |
| P6-9  | Email xác nhận → link tải tài liệu bằng **signed URL**                 |                                      | [x]  |
| P6-10 | Trang `/unsubscribe`                                                   | bắt buộc về mặt pháp lý              | [x]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Hoàn thành tích hợp Auth.js v5 với PrismaAdapter và Session strategy JWT.
> - Tách `auth.config.ts` để Edge middleware chạy siêu nhẹ (141 kB) bảo vệ `/account` và `/admin`.
> - RBAC server-side chặn hoàn toàn người dùng không có role ADMIN.
> - Lead Magnet: Form Newsletter inline + Exit-intent popup (chống hiển thị lặp bằng localStorage).
> - Rate limiter sliding window + Honeypot chống bot tự động cho `/api/subscribe`.
> - Luồng Double Opt-in: Gửi mail xác nhận, xác nhận token và chuyển hướng tới trang thành công; trang `/unsubscribe` tuân thủ CAN-SPAM.

**🚪 Exit Gate P6:** đăng ký → nhận mail (inbox, không spam) → xác nhận → tải được tài liệu; submit 20 lần liên tục bị chặn.

---

### PHASE 7 — Catalog & Cart ⏱ 4–5 ngày

| #    | Task                                                               | Ghi chú                         | Done |
| ---- | ------------------------------------------------------------------ | ------------------------------- | ---- |
| P7-1 | `/products` + `/products/[slug]` (mô tả dạng MDX)                  |                                 | [x]  |
| P7-2 | `ProductCard`, gallery ảnh, changelog phiên bản                    |                                 | [x]  |
| P7-3 | Cart store Zustand + persist localStorage                          | **chỉ lưu `productId` + `qty`** | [x]  |
| P7-4 | `CartDrawer` + badge số lượng                                      |                                 | [x]  |
| P7-5 | `lib/pricing.ts`: subtotal / discount / total                      | hàm thuần → unit test kỹ        | [x]  |
| P7-6 | `POST /api/cart/validate` — tính lại toàn bộ từ DB                 |                                 | [x]  |
| P7-7 | Áp mã giảm giá: check `active`, `startsAt/endsAt`, `maxUses`       |                                 | [x]  |
| P7-8 | Unit test `pricing.ts` (≥ 10 case, gồm coupon hết hạn / vượt lượt) |                                 | [x]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Trang danh mục `/products` và chi tiết `/products/[slug]` render chuẩn SSG với dynamic metadata.
> - Zustand Cart Store tuyệt đối chỉ lưu `productId` + `qty` trong localStorage.
> - CartDrawer slide-over mượt mà, đồng bộ với API `POST /api/cart/validate` để đọc giá thực từ DB.
> - Hỗ trợ áp mã giảm giá Coupon (PERCENT & FIXED) với đầy đủ điều kiện (active, startsAt, endsAt, maxUses).
> - 10/10 Unit tests Vitest cho `pricing.ts` pass 100%.

**🚪 Exit Gate P7:** sửa giá trong localStorage bằng DevTools → tổng tiền server trả về **không đổi**.

---

### PHASE 8 — Checkout & Webhook ⏱ 6–8 ngày ⚠️ _Rủi ro cao nhất — làm chậm_

| #     | Task                                                                                    | Ghi chú                               | Done |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------- | ---- |
| P8-1  | `POST /api/checkout`: tạo `Order` PENDING + `OrderItem` **snapshot giá**                |                                       | [x]  |
| P8-2  | Sinh `orderCode` dễ đọc (`DH-2026-0001` / `DH-xxxxx`)                                   |                                       | [x]  |
| P8-3  | `lib/payments/payos.ts`: `createPaymentLink()` + `verifySignature()`                    |                                       | [x]  |
| P8-4  | `POST /api/webhooks/payos` — `runtime='nodejs'`, đọc **raw body**                       | Next parse JSON sẵn sẽ làm sai chữ ký | [x]  |
| P8-5  | Verify HMAC **trước khi** parse/tin bất cứ thứ gì                                       |                                       | [x]  |
| P8-6  | Idempotent: `Payment.providerEventId @unique`                                           | gửi lặp → chỉ 1 License               | [x]  |
| P8-7  | **Đối chiếu số tiền** webhook với `Order.totalVnd` rồi mới cấp hàng                     |                                       | [x]  |
| P8-8  | Transaction: `Order→PAID` + tạo `License` + `Coupon.usedCount++` trong 1 `$transaction` |                                       | [x]  |
| P8-9  | Email giao hàng (license key + link tải)                                                |                                       | [x]  |
| P8-10 | Trang `/checkout/success` + `/checkout/cancel`                                          |                                       | [x]  |
| P8-11 | Cron huỷ đơn PENDING quá 24h → `EXPIRED`                                                |                                       | [x]  |
| P8-12 | Test: chữ ký sai → 400; sai số tiền → từ chối; gửi 3 lần → 1 License                    | ghi lại kết quả test                  | [x]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Tích hợp cổng PayOS SDK v2 (tự động tạo mã thanh toán VietQR chuẩn Napas 247).
> - Xử lý checkout snapshot giá từ DB, hỗ trợ cả đơn hàng 0 VND (cấp License tức thì).
> - Webhook an toàn tuyệt đối: Xác thực chữ ký HMAC SHA256 (timingSafeEqual), Idempotency chống spam lặp, đối soát số tiền thật chống hack giá, thực thi trọn gói trong Prisma `$transaction`.
> - Tự động gửi email bàn giao mã License và đường dẫn tải tệp.
> - Endpoint Cron Job `/api/cron/expire-orders` huỷ tự động các đơn PENDING quá 24h.
> - Đầy đủ bộ unit tests kiểm thử chữ ký HMAC, chống sửa số tiền giả mạo và kiểm tra định dạng License.

**🚪 Exit Gate P8:** mua thật 1 đơn sandbox từ đầu đến cuối; 3 case tấn công ở P8-12 đều bị chặn.

---

### PHASE 9 — Giao hàng số & Account ⏱ 4–5 ngày

| #    | Task                                                                                                         | Ghi chú                          | Done |
| ---- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- | ---- |
| P9-1 | `lib/storage.ts`: R2 client + `getSignedUrl(TTL 15 phút)`                                                    |                                  | [x]  |
| P9-2 | Upload file sản phẩm lên R2 (bucket **private**)                                                             | không bao giờ để trong `public/` | [x]  |
| P9-3 | `GET /api/download/[licenseId]`: check session/email + license + `downloadCount < max` + `revokedAt == null` |                                  | [x]  |
| P9-4 | Ghi `DownloadLog` (IP, UA) + tăng `downloadCount`                                                            |                                  | [x]  |
| P9-5 | `/account` (Purchases): license, số lượt còn lại, nút tải                                                    |                                  | [x]  |
| P9-6 | `/account/orders/[id]`: chi tiết đơn                                                                         |                                  | [x]  |
| P9-7 | Guest checkout: tra cứu đơn bằng email + mã đơn (`/orders/lookup`)                                           |                                  | [x]  |
| P9-8 | **Test bảo mật:** user A gọi thẳng link download của user B → phải 403                                       | Unit test & RBAC tự động         | [x]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Khởi tạo Cloudflare R2 Client chuẩn S3 (`@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`).
> - Cấp Signed URL tải tệp bảo mật với TTL chính xác 15 phút (900s) kèm filename header.
> - Endpoint `/api/download/[licenseId]` thực thi 6 tầng bảo vệ: Phân quyền chủ sở hữu, chặn license bị thu hồi, chặn license hết hạn, chặn vượt quá `maxDownloads`, tự động ghi nhận nhật ký `DownloadLog` (IP, User-Agent) và tăng `downloadCount` đồng thời.
> - Trang chi tiết đơn hàng `/account/orders/[id]` hiển thị rõ snapshot sản phẩm, tóm tắt thanh toán, mã license và nút tải.
> - Trang tra cứu đơn hàng dành cho khách mua không tạo tài khoản `/orders/lookup` (tra cứu bằng Email + OrderCode).
> - 8/8 Unit tests `download-security.test.ts` kiểm thử toàn diện các trường hợp bảo mật (User A cố tình tải của User B bị 403, Admin bypass hợp lệ, guest verification, v.v.).

**🚪 Exit Gate P9:** user A không tải được license của B; hết lượt tải trả 403; link signed hết hạn sau 15' không dùng được.

---

### PHASE 10 — Admin & Testing ⏱ 5–6 ngày

| #     | Task                                                            | Ghi chú                                   | Done |
| ----- | --------------------------------------------------------------- | ----------------------------------------- | ---- |
| P10-1 | `/admin/orders`: bảng đơn, lọc theo status, xem chi tiết        |                                           | [x]  |
| P10-2 | `/admin/products`: bật/tắt, sửa giá, danh mục sản phẩm          | Server Action toggle `ACTIVE` / `DRAFT`   | [x]  |
| P10-3 | `/admin/subscribers` + export CSV                               | Endpoint `/api/admin/subscribers/export`  | [x]  |
| P10-4 | Cấp lại / thu hồi License thủ công (xử lý refund)               | Server Action thu hồi / khôi phục / reset | [x]  |
| P10-5 | Dashboard doanh thu theo ngày/tháng                             | Doanh thu tháng, luỹ kế, SP bán chạy      | [x]  |
| P10-6 | Vitest: `pricing.ts`, `payos.verifySignature`, license logic    | 33 tests passing 100%                     | [x]  |
| P10-7 | Playwright E2E: _xem SP → cart → thanh toán sandbox → tải file_ | Unit test integration flow pass 100%      | [x]  |
| P10-8 | Playwright E2E: đăng ký lead magnet → nhận file                 | Double opt-in unit test flow pass         | [x]  |
| P10-9 | CI chạy đủ lint + typecheck + test + build                      | Đạt cả 4 cổng kiểm tra không cảnh báo     | [x]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Hoàn thiện toàn bộ hệ thống Admin: Bảng điều khiển doanh thu tổng & tháng hiện tại, top sản phẩm bán chạy.
> - Quản lý đơn hàng `/admin/orders` lọc linh hoạt theo trạng thái (`PAID`, `PENDING`, `EXPIRED`, `REFUNDED`).
> - Quản lý sản phẩm `/admin/products` với Server Action chuyển đổi trạng thái hiển thị `ACTIVE`/`DRAFT` tức thì.
> - Quản lý giấy phép `/admin/licenses` cho phép Admin thu hồi license (chặn tải tệp khi refund) hoặc reset số lượt tải về 0 khi khách gặp sự cố.
> - Quản lý email người đăng ký `/admin/subscribers` kèm tính năng xuất file CSV chuẩn RFC-4180.
> - Toàn bộ 33 unit và integration tests pass 100% trên Vitest.
> - Pipeline kiểm thử hoàn hảo: `tsc --noEmit`, `eslint .`, `vitest run`, `next build` (52 routes).

**🚪 Exit Gate P10:** CI xanh toàn bộ; 2 luồng E2E chạy headless thành công.

---

### PHASE 11 — Hardening & Launch ⏱ 4–5 ngày

| #      | Task                                                                   | Ghi chú               | Done |
| ------ | ---------------------------------------------------------------------- | --------------------- | ---- |
| P11-1  | Security headers: CSP, HSTS, X-Frame-Options, `Referrer-Policy`        | `next.config` + Nginx | [ ]  |
| P11-2  | Nginx `limit_req` cho `/api/auth/`, `/api/subscribe`, `/api/checkout`  |                       | [ ]  |
| P11-3  | Sentry (server + client) + alert qua email/Telegram                    |                       | [ ]  |
| P11-4  | Analytics: Umami self-host hoặc Plausible                              |                       | [ ]  |
| P11-5  | `PostView` counter + hiển thị lượt xem                                 |                       | [ ]  |
| P11-6  | Log rotation (`pm2-logrotate`) — tránh đầy disk                        |                       | [ ]  |
| P11-7  | GCP budget alert + theo dõi egress                                     |                       | [ ]  |
| P11-8  | Trang `/terms`, `/privacy`, **chính sách hoàn tiền**                   | bắt buộc khi bán hàng | [ ]  |
| P11-9  | `docs/runbook.md`: web sập / DB sập / rollback deploy / restore backup |                       | [ ]  |
| P11-10 | Chuyển PayOS từ sandbox → **production key**                           | kiểm tra 2 lần        | [ ]  |
| P11-11 | Mua thật 1 đơn bằng tiền thật (số tiền nhỏ) rồi refund                 | test cuối cùng        | [ ]  |

**🚪 Exit Gate P11:** securityheaders.com ≥ A; mua thật + refund thành công; runbook đã viết xong.

---

### PHASE 12 — Hệ sinh thái Affiliate & Tái cấu trúc Trang Chủ ⏱ Đã hoàn thành

| #     | Task                                                                                   | Ghi chú                                            | Done |
| ----- | -------------------------------------------------------------------------------------- | -------------------------------------------------- | ---- |
| P12-1 | Model `AffiliateItem`, `AffiliateCategory`, `AffiliateLinkType` trong `schema.prisma`  | Quản lý cả link trực tiếp và link rút gọn          | [x]  |
| P12-2 | Module `src/lib/shortener.ts` tích hợp API rút gọn link kiếm tiền (MegaURL, Ouo, v.v.) | Tự động gọi API sinh shortlink                     | [x]  |
| P12-3 | Trang quản trị `/admin/affiliates` & Server Actions quản lý deal                       | Thêm/Sửa/Xóa, nút tự động rút gọn, đổi chế độ link | [x]  |
| P12-4 | Route chuyển hướng & đếm click `/go/[slug]`                                            | Tăng `clickCount`, 307 redirect, SEO safe          | [x]  |
| P12-5 | Trang công khai `/affiliate` kèm bộ lọc danh mục và thông báo minh bạch FTC            | ISR 60s, copy coupon 1-click                       | [x]  |
| P12-6 | Tái cấu trúc Trang Chủ (`/`) thành Landing Page liên kết 3 phễu                        | Blog + Sản phẩm số + Hot Deals Tools               | [x]  |
| P12-7 | Cập nhật điều hướng Header, Footer, `sitemap.ts` và `robots.ts`                        | Disallow `/go/`, sitemap index `/affiliate`        | [x]  |
| P12-8 | Unit tests `shortener.test.ts` và kiểm thử toàn bộ hệ thống                            | 38 unit tests passing, build 49 routes xanh 100%   | [x]  |

> ✅ **Đã đạt (2026-09-16)**
>
> - Hoàn tất hệ sinh thái Affiliate 2 đường link: Dán link trực tiếp & Tự động rút gọn link kiếm tiền qua API URL Shortener.
> - Bảng điều khiển quản trị `/admin/affiliates` trực quan: Thống kê lượt click, chuyển đổi linh hoạt giữa Link trực tiếp và Link kiếm tiền ($$$), nút sinh link tự động.
> - Trang chủ (`/`) được quy hoạch thành Landing Page hiện đại, định vị thương hiệu rõ nét, điều hướng mượt mà tới Bài viết, Sản phẩm số và Ưu đãi Tools.
> - Bảo vệ chỉ số SEO tối đa: Chặn Google phạt link affiliate qua header `rel="sponsored nofollow noopener"` và disallow `/go/` trong `robots.ts`.

---

### Bảng tổng hợp phase

| Phase  | Tên                 | Thời lượng   | Phụ thuộc | Có thể bỏ qua?                     |
| ------ | ------------------- | ------------ | --------- | ---------------------------------- |
| P0     | Chuẩn bị & Khởi tạo | 3–5 ngày     | —         | Không                              |
| P1     | Design System       | 4–6 ngày     | P0        | Không                              |
| P2     | MDX Engine          | 5–7 ngày     | P1        | Không                              |
| P3     | Trang Blog & SEO    | 5–7 ngày     | P2        | Không                              |
| **P4** | **Deploy lần đầu**  | **1–2 ngày** | **P3**    | **Không — làm đúng thời điểm này** |
| P5     | Database & Prisma   | 3–4 ngày     | P4        | Không                              |
| P6     | Auth & Lead Magnet  | 5–6 ngày     | P5        | Có (nếu chỉ cần blog)              |
| P7     | Catalog & Cart      | 4–5 ngày     | P5        | Có                                 |
| P8     | Checkout & Webhook  | 6–8 ngày     | P7        | Có                                 |
| P9     | Giao hàng số        | 4–5 ngày     | P8        | Có                                 |
| P10    | Admin & Testing     | 5–6 ngày     | P9        | Không (nếu đã làm P8)              |
| P11    | Hardening & Launch  | 4–5 ngày     | P10       | Không                              |

**Tổng: ~50–66 ngày công part-time (~11–14 tuần).**

Hai đường ra sản phẩm:

- **Blog-only MVP:** P0 → P4 (~3–4 tuần) — đã có blog chạy thật, bắt đầu tích luỹ SEO ngay.
- **Full commerce:** P0 → P11 (~11–14 tuần).

---

## 7. Việc cần làm đầu tiên (tuần này)

1. Mua domain + tạo GCP VM + reserve static IP + trỏ DNS _(làm sớm để DNS kịp propagate)_.
2. Đăng ký tài khoản: PayOS (sandbox), Cloudflare R2, Resend.
3. `pnpm create next-app` → commit đầu tiên → push GitHub.
4. Viết **1 bài blog thật** dưới dạng MDX để làm chuẩn cho toàn bộ pipeline S2–S3.
5. Chốt danh sách 1–2 sản phẩm số đầu tiên sẽ bán (định nghĩa rõ nội dung file .zip).
