# Blog Lập trình & Quản trị Server

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

**Cổng chất lượng** — phải xanh trước khi commit/push:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm build
```

## Quy ước

- **Biến môi trường:** khai báo trong `src/config/env.ts` (Zod). Không đọc thẳng `process.env` ở nơi khác. Thiếu/sai biến → app crash lúc khởi động, không chạy nửa vời.
- **Metadata site:** chỉ sửa ở `src/config/site.ts`, không hardcode tên/URL trong component.
- **Alias:** `@/*` → `src/*`.
- **TypeScript strict** + `noUncheckedIndexedAccess` — truy cập mảng/object theo index trả về `T | undefined`, phải xử lý.
- **Pre-commit:** Husky chạy lint-staged (Prettier + ESLint --fix) trên file đã stage.

## Trạng thái

- [x] **P0** — Chuẩn bị & khởi tạo
- [ ] P1 — Design System & Layout
- [ ] P2 — MDX Engine
- [ ] P3 — Trang Blog & SEO
- [ ] P4 — 🚩 Deploy lần đầu
- [ ] P5–P11 — xem `docs/PLAN.md`
