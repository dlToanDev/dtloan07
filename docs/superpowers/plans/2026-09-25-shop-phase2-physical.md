# Shop Giai đoạn 2: Đồ vật lý — Implementation Plan

**Goal:** Bán được đồ vật lý: khách nhập địa chỉ, chọn PayOS hoặc COD, phí ship tính theo khu vực; tồn kho được giữ chỗ khi đặt và trả lại khi đơn hết hạn/bị hủy; admin quản lý khu vực ship và vòng đời giao hàng của đơn.

**Spec:** `docs/superpowers/specs/2026-09-25-shop-redesign-design.md` — mục 3.1 (`PaymentMethod`, `FulfillmentStatus`), 3.5, 3.6, 5.4–5.7, 6.3, 6.4, 6.5, 10 giai đoạn 2.

**Tiền đề:** Giai đoạn 1 đã xong và đã merge vào `dev`; migration `20260926090000_shop_variants` đã apply.

## Global Constraints

- `PURCHASABLE_TYPES` thêm `PHYSICAL`. `ACCOUNT` vẫn "Sắp mở bán" tới giai đoạn 3.
- Tiền là số nguyên VND. Server luôn tự tính lại giá và phí ship, client chỉ gửi lựa chọn.
- Mọi logic thuần (chọn khu ship, phân bổ giảm giá cho hàng vật lý, kiểm tra điều kiện COD) nằm trong `src/lib/shop/*` có unit test; route chỉ gọi vào.
- Giữ chỗ tồn kho và tạo đơn nằm trong **một** `db.$transaction`; trừ kho bằng `UPDATE … WHERE stock >= qty` để hai người mua cùng lúc không bán vượt.
- Luồng Source Code và hàng `DOWNLOAD` phải chạy y như cũ.
- Chạy trước mỗi commit: `pnpm typecheck && pnpm lint && pnpm test`.

## Khác biệt có chủ ý so với spec

1. **Hạn thanh toán PayOS 30 phút** chỉ áp dụng cho đơn **có giữ chỗ tồn kho** (hàng vật lý). Đơn chỉ gồm hàng `DOWNLOAD` giữ nguyên 24 giờ như hiện tại — rút xuống 30 phút sẽ làm hỏng trải nghiệm mua file vốn không giữ kho.
2. **Giảm giá phân bổ theo tỉ lệ** khi giỏ trộn hàng vật lý và hàng số: ngưỡng freeship so với `physicalSubtotal − discount × physicalSubtotal / subtotal`. Spec chỉ nói "tạm tính hàng vật lý sau khi trừ giảm giá" mà không định nghĩa cho giỏ trộn.

## Task

### Task 1: Schema + migration + danh sách tỉnh

- `prisma/schema.prisma`: enum `PaymentMethod`, `FulfillmentStatus`; model `ShippingZone`; `Order` thêm `paymentMethod`, `fulfillmentStatus`, `customerName`, `phone`, `shipProvince`, `shipAddress`, `shipNote`, `shippingFeeVnd`, `trackingCode`, `cancelledAt`.
- `prisma/migrations/2026…_shop_shipping/migration.sql`: DDL + seed 3 khu ("Nội thành" 20.000, "Lân cận" 30.000, "Toàn quốc (mặc định)" 40.000 `isDefault`).
- `src/config/provinces.ts`: 34 tỉnh/thành theo đơn vị hành chính từ 01/07/2025, dạng `{ code, name }`, `code` là slug.

### Task 2: Module thuần phí ship (`src/lib/shop/shipping.ts`)

- `quoteShipping({ zones, provinceCode, physicalSubtotalVnd })` → `{ feeVnd, zoneName, freeShip }`: khu chứa tỉnh có `sortOrder` nhỏ nhất; không khớp thì rơi về khu `isDefault`; không có khu nào thì phí 0.
- `splitCartTotals(lines, pricing)` → `{ physicalSubtotalVnd, physicalAfterDiscountVnd, hasPhysical, allPhysical }`.
- `canUseCOD(lines)`; `PROVINCE_PHONE_RE`.
- Test: `tests/unit/shop-shipping.test.ts` theo spec mục 9.

### Task 3: Checkout server (`/api/checkout`)

Input thêm `phone`, `customerName`, `paymentMethod`, `shipping { province, address, note }`. Trong một transaction: validate → tính giá + phí ship → trừ kho có điều kiện → tạo `Order`. COD `status=PENDING, expiresAt=null`; PayOS có giữ kho thì `expiresAt=now+30′`. Sau commit: email "Đã nhận đơn" cho khách COD + email báo admin.

### Task 4: `/api/shipping/quote` + giao diện checkout

Dropdown 34 tỉnh, địa chỉ, ghi chú, số điện thoại; chọn PayOS/COD (COD chỉ hiện khi mọi món là hàng vật lý); tóm tắt đơn có dòng phí ship / "Miễn phí".

### Task 5: Trả lại tồn kho (`releaseOrderInventory`) + cron

Hàm dùng chung cộng lại `stock` theo `OrderItem`; cron `expire-orders` gọi nó cho đơn PayOS quá hạn; admin hủy đơn cũng gọi.

### Task 6: Admin khu vực ship `/admin/shop/shipping`

CRUD `ShippingZone` (chọn tỉnh bằng checkbox, phí, ngưỡng freeship). Khu mặc định không xóa được. Tỉnh đã thuộc khu khác có chú thích. Thêm mục sidebar.

### Task 7: Admin đơn hàng

`/admin/orders` thêm lọc `fulfillment` + badge "Cần xử lý". Trang mới `/admin/orders/[id]`: thông tin giao hàng, hành động `Xác nhận → Giao hàng (mã vận đơn) → Đã giao` (COD "Đã giao" thì đồng thời `PAID`), `Hủy đơn` gọi `releaseOrderInventory`. Mỗi lần đổi trạng thái gửi email cho khách.

### Task 8: Webhook PayOS + email

Webhook chuyển `fulfillmentStatus` theo loại hàng: `PHYSICAL` → `CONFIRMED`; đơn chỉ có `DOWNLOAD` → `DELIVERED`. `src/lib/mail.ts` thêm `sendOrderReceivedEmail`, `sendOrderStatusEmail`, `sendAdminNewOrderEmail`; env mới `ADMIN_NOTIFY_EMAIL`.
