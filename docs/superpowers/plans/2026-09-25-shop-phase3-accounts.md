# Shop Giai đoạn 3: Tài khoản số — Implementation Plan

**Goal:** Bán tài khoản số (Netflix, Codex…) với biến thể theo thời hạn gói. Mỗi sản phẩm chọn bàn giao **tự động** (lấy từ kho, gửi ngay sau khi PayOS xác nhận) hoặc **thủ công** (admin nhập và gửi). Thông tin tài khoản luôn được mã hóa trong database và mọi lần giải mã đều ghi log.

**Spec:** `docs/superpowers/specs/2026-09-25-shop-redesign-design.md` — mục 3.1 (`AccountStockStatus`), 3.4, 3.7 phần còn lại, 3.8, 4, 5.2 (giới hạn 5), 5.5 bước 4, 5.6, 5.7, 5.8, 6.2, 6.4 (bàn giao thủ công), 6.5, 7, 10 giai đoạn 3.

**Tiền đề:** Giai đoạn 1 và 2 đã merge vào `dev`; database đã chạy migration tới `20260927090000_shop_shipping`.

## Global Constraints

- `PURCHASABLE_TYPES` thêm `ACCOUNT` — kết thúc trạng thái "Sắp mở bán".
- **Không bao giờ** lưu thông tin tài khoản dạng chữ thường trong DB, kể cả log và email đã gửi.
- Không trả chuỗi đã giải mã trong danh sách; chỉ giải mã theo từng dòng khi có yêu cầu, và mỗi lần đều ghi `CredentialAccessLog`.
- Thiếu `ACCOUNT_ENCRYPTION_KEY` thì: nhập kho báo lỗi rõ ràng, checkout từ chối biến thể tài khoản `AUTO`.
- Tồn kho tài khoản `AUTO` = số dòng `AccountStock` trạng thái `AVAILABLE`; `ProductVariant.stock` luôn `null`.
- Giữ chỗ tài khoản bằng `SELECT … FOR UPDATE SKIP LOCKED` để hai người mua cùng lúc không nhận trùng tài khoản.
- Mỗi dòng giỏ hàng tài khoản tối đa 5 (spec 5.2).
- Chạy trước mỗi commit: `pnpm typecheck && pnpm lint && pnpm test`; test tích hợp `pnpm test:int`.

## Task

### Task 1: Schema + migration

- `AccountStockStatus { AVAILABLE RESERVED DELIVERED REVOKED }`, model `AccountStock`, model `CredentialAccessLog`.
- `OrderItem` thêm `deliveredCredentials String? @db.Text`, `deliveredAt DateTime?`.
- `ProductVariant` thêm quan hệ `accountStock AccountStock[]`.
- `.env.example` + `src/config/env.ts`: `ACCOUNT_ENCRYPTION_KEY` (32 byte base64).

### Task 2: Module mã hóa (`src/lib/crypto/credentials.ts`)

- `encryptCredentials(plain): string` → base64(iv | tag | ciphertext), AES-256-GCM, IV 12 byte ngẫu nhiên.
- `decryptCredentials(blob): string` — dữ liệu bị sửa thì throw.
- `isCredentialKeyConfigured(): boolean`.
- Test: roundtrip, tag sai thì lỗi, thiếu khóa thì lỗi, hai lần mã hóa cùng chuỗi ra kết quả khác nhau.

### Task 3: Kho tài khoản + tồn kho hiển thị

- `src/lib/shop/account-stock.ts`: `countAvailable`, `reserveAccountsForItem` (FOR UPDATE SKIP LOCKED), `releaseAccountsForOrder`, `deliverAccountsForOrder`.
- `loadCartProducts` trả thêm số tài khoản còn trống để `resolveCartLines` chặn mua quá kho.
- Giới hạn 5 mỗi dòng cho hàng `ACCOUNT`.

### Task 4: Checkout + webhook + cron

- Checkout: mở bán `ACCOUNT`, chặn COD (đã có luật "COD chỉ cho đơn toàn hàng vật lý"), giữ chỗ tài khoản trong cùng transaction, từ chối khi thiếu khóa mã hóa.
- Webhook PayOS đã thanh toán: `ACCOUNT` + `AUTO` → chuyển `AccountStock` sang `DELIVERED`, gửi email kèm thông tin (log `EMAIL`); `ACCOUNT` + `MANUAL` → giữ `PENDING`, email báo admin; đơn chỉ gồm `AUTO`/`DOWNLOAD` → `fulfillmentStatus = DELIVERED`.
- Cron hết hạn và hủy đơn: trả `AccountStock` `RESERVED` về `AVAILABLE`.

### Task 5: Admin kho tài khoản

- Tab trong trang sửa sản phẩm, chỉ hiện khi `type = ACCOUNT` và `deliveryMode = AUTO`.
- Nhập hàng loạt theo biến thể (mỗi dòng một tài khoản), bảng trạng thái, nút 👁 giải mã từng dòng (log `ADMIN_VIEW`), xóa dòng `AVAILABLE`, nút "Đổi tài khoản" cho dòng `DELIVERED` (bảo hành).

### Task 6: Admin bàn giao thủ công

Trong `/admin/orders/[id]`: item `ACCOUNT` + `MANUAL` chưa giao có ô nhập thông tin và nút "Bàn giao" (mã hóa, lưu `deliveredCredentials`, email khách). Khi mọi item đã giao thì đơn chuyển `DELIVERED`.

### Task 7: Khách xem thông tin tài khoản

- `POST /api/orders/credentials`: kiểm tra quyền (user sở hữu đơn, hoặc mã đơn + email khớp), rate-limit theo IP, giải mã và ghi log `CUSTOMER_VIEW`.
- Hiển thị nút "Xem thông tin tài khoản" ở `/account/orders/[id]` và trang tra cứu đơn.
