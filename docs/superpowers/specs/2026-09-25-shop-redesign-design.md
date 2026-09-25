# Thiết kế lại Shop: đồ vật lý, đồ công nghệ, tài khoản số

- Ngày: 2026-09-25
- Trạng thái: Chờ duyệt
- Phạm vi: chỉ mục **Shop** (`Product.kind = SHOP`). Mục **Source Code** giữ nguyên luồng hiện tại.

## 1. Mục tiêu

Shop bán 3 nhóm hàng trong cùng một giỏ hàng và một luồng checkout:

1. **Đồ lưu niệm**: quần, áo, mũ, cốc, phụ kiện. Có biến thể size/màu.
2. **Đồ công nghệ**: hàng mới và hàng cũ, có ghi rõ tình trạng và bảo hành.
3. **Tài khoản số**: Netflix, Codex… Có biến thể theo thời hạn gói. Mỗi sản phẩm chọn bàn giao **tự động** (từ kho) hoặc **thủ công** (admin nhập).

Tiêu chí thành công:

- Admin đăng được cả 3 loại hàng mà không cần sửa code.
- Khách đặt được đơn COD cho đồ vật lý và đơn PayOS cho mọi loại hàng.
- Không bán vượt tồn kho, kể cả khi nhiều người mua cùng lúc.
- Tài khoản bàn giao tự động được gửi cho khách trong vòng 1 phút sau khi PayOS xác nhận thanh toán.
- Thông tin tài khoản không bao giờ lưu dạng chữ thường trong DB.

Ngoài phạm vi (để giai đoạn sau): tích hợp API GHN/GHTK, trả hàng/đổi size tự động, đa tiền tệ.

### Rủi ro đã được chấp nhận

Bán lại tài khoản Netflix/OpenAI vi phạm điều khoản của các dịch vụ này. Tài khoản có thể bị khóa, và merchant PayOS có thể bị báo cáo. Chủ shop đã biết rủi ro và sẽ tự công bố chính sách bảo hành/hoàn tiền trên trang sản phẩm (trường `warrantyNote`).

## 2. Quyết định đã chốt

| Chủ đề                  | Quyết định                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Kiến trúc               | Mở rộng model `Product` hiện có (phương án A), dùng chung giỏ hàng/checkout/PayOS/coupon |
| Thanh toán đồ vật lý    | PayOS (QR/chuyển khoản) hoặc COD                                                         |
| Thanh toán tài khoản số | Chỉ PayOS. Giỏ có tài khoản số thì không cho chọn COD                                    |
| Biến thể                | Mỗi biến thể có giá và tồn kho riêng                                                     |
| Phí ship                | Theo khu vực (`ShippingZone`), có ngưỡng freeship theo từng khu                          |
| Bàn giao tài khoản      | Cấu hình theo sản phẩm: `AUTO` (kho) hoặc `MANUAL` (admin nhập)                          |
| Guest checkout          | Giữ nguyên: email + họ tên + số điện thoại, không bắt đăng nhập                          |

## 3. Mô hình dữ liệu (Prisma)

### 3.1 Enum mới

```prisma
enum ProductType      { DOWNLOAD PHYSICAL ACCOUNT }
enum ShopCategory     { APPAREL HAT MUG ACCESSORY TECH ACCOUNT OTHER }
enum ItemCondition    { NEW LIKE_NEW USED }
enum DeliveryMode     { AUTO MANUAL }
enum PaymentMethod    { PAYOS COD }
enum FulfillmentStatus { PENDING CONFIRMED SHIPPING DELIVERED CANCELLED }
enum AccountStockStatus { AVAILABLE RESERVED DELIVERED REVOKED }
```

`FulfillmentStatus` dùng chung cho cả tài khoản thủ công: `PENDING` (chờ bàn giao) → `DELIVERED`.

### 3.2 `Product` (thêm cột)

| Cột             | Kiểu                             | Ghi chú                                               |
| --------------- | -------------------------------- | ----------------------------------------------------- |
| `type`          | `ProductType` @default(DOWNLOAD) | Mọi bản ghi hiện có là `DOWNLOAD`                     |
| `category`      | `ShopCategory?`                  | Bắt buộc khi `kind = SHOP` (kiểm tra ở server action) |
| `condition`     | `ItemCondition?`                 | Chỉ dùng khi `category = TECH`                        |
| `conditionNote` | `String?`                        | Ví dụ "Trầy nhẹ cạnh, pin 88%"                        |
| `warrantyNote`  | `String?`                        | Ví dụ "Bảo hành 7 ngày"                               |
| `deliveryMode`  | `DeliveryMode?`                  | Bắt buộc khi `type = ACCOUNT`                         |
| `gallery`       | `String[]` @default([])          | URL ảnh, theo thứ tự hiển thị                         |

`priceVnd` và `compareAtVnd` giữ lại để tương thích ngược. Với sản phẩm Shop mới, hai cột này được đồng bộ bằng giá biến thể rẻ nhất (dùng cho sắp xếp và cho code cũ).

### 3.3 `ProductVariant` (mới)

```prisma
model ProductVariant {
  id           String  @id @default(cuid())
  productId    String
  name         String          // "Đen / M", "3 tháng", "Mặc định"
  sku          String?  @unique
  priceVnd     Int
  compareAtVnd Int?
  stock        Int?            // null = không giới hạn
  sortOrder    Int     @default(0)
  active       Boolean @default(true)

  product      Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  orderItems   OrderItem[]
  accountStock AccountStock[]

  @@index([productId, active])
}
```

- Mỗi sản phẩm luôn có ít nhất 1 biến thể. Migration tạo biến thể "Mặc định" cho mọi sản phẩm hiện có, lấy `priceVnd`/`compareAtVnd` hiện tại và `stock = null`.
- Tài khoản `AUTO`: `stock` luôn bằng `null`. Tồn kho thực tế = số `AccountStock` có trạng thái `AVAILABLE` của biến thể đó.

### 3.4 `AccountStock` (mới)

```prisma
model AccountStock {
  id            String             @id @default(cuid())
  variantId     String
  credentials   String   @db.Text  // AES-256-GCM: base64(iv|tag|ciphertext)
  status        AccountStockStatus @default(AVAILABLE)
  orderItemId   String?
  reservedUntil DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime @default(now())

  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Restrict)
  orderItem OrderItem?     @relation(fields: [orderItemId], references: [id], onDelete: SetNull)

  @@index([variantId, status])
  @@index([orderItemId])
}
```

### 3.5 `ShippingZone` (mới)

```prisma
model ShippingZone {
  id              String   @id @default(cuid())
  name            String
  provinces       String[]          // mã tỉnh trong src/config/provinces.ts
  feeVnd          Int
  freeShipFromVnd Int?
  isDefault       Boolean  @default(false) // đúng 1 khu mặc định, không xóa được
  sortOrder       Int      @default(0)
}
```

- Danh sách tỉnh là **34 tỉnh/thành** (theo đơn vị hành chính từ 01/07/2025), đặt trong `src/config/provinces.ts` gồm `{ code, name }`.
- Seed 3 khu: "Nội thành" 20.000 đ, "Lân cận" 30.000 đ, "Toàn quốc (mặc định)" 40.000 đ. Freeship để trống, admin tự sửa.
- Nếu một tỉnh nằm trong nhiều khu, lấy khu có `sortOrder` nhỏ nhất.

### 3.6 `Order` (thêm cột)

| Cột                                       | Kiểu                                                       |
| ----------------------------------------- | ---------------------------------------------------------- |
| `paymentMethod`                           | `PaymentMethod` @default(PAYOS)                            |
| `fulfillmentStatus`                       | `FulfillmentStatus?` (null khi đơn chỉ có hàng `DOWNLOAD`) |
| `customerName`, `phone`                   | `String?`                                                  |
| `shipProvince`, `shipAddress`, `shipNote` | `String?`                                                  |
| `shippingFeeVnd`                          | `Int` @default(0)                                          |
| `trackingCode`                            | `String?`                                                  |
| `cancelledAt`                             | `DateTime?`                                                |

Công thức: `totalVnd = subtotalVnd − discountVnd + shippingFeeVnd`. Coupon không giảm vào phí ship.

### 3.7 `OrderItem` (thêm cột)

| Cột                    | Kiểu                                                     |
| ---------------------- | -------------------------------------------------------- |
| `variantId`            | `String?` (nullable cho đơn cũ)                          |
| `variantNameSnapshot`  | `String?`                                                |
| `productTypeSnapshot`  | `ProductType` @default(DOWNLOAD)                         |
| `deliveredCredentials` | `String? @db.Text` (mã hóa; dùng cho tài khoản `MANUAL`) |
| `deliveredAt`          | `DateTime?`                                              |

### 3.8 `CredentialAccessLog` (mới)

Mỗi lần giải mã thông tin tài khoản sẽ ghi 1 dòng: `id, actorUserId?, actorEmail, accountStockId?, orderItemId?, reason ('ADMIN_VIEW' | 'CUSTOMER_VIEW' | 'EMAIL'), createdAt`.

## 4. Mã hóa thông tin tài khoản

- Module `src/lib/crypto/credentials.ts`: `encryptCredentials(plain: string): string` và `decryptCredentials(blob: string): string`, dùng AES-256-GCM (`node:crypto`), IV ngẫu nhiên 12 byte.
- Khóa lấy từ env `ACCOUNT_ENCRYPTION_KEY`: 32 byte mã hóa base64, tạo bằng `openssl rand -base64 32`. Thêm vào `src/config/env.ts` và `.env.example`.
- Server action nhập kho hoặc bàn giao tài khoản sẽ báo lỗi rõ ràng nếu thiếu khóa. Checkout cũng từ chối biến thể tài khoản `AUTO` khi chưa có khóa.
- Không bao giờ trả chuỗi đã giải mã trong danh sách. Chỉ giải mã khi có yêu cầu xem theo từng dòng, và mỗi lần giải mã đều được ghi log.

## 5. Luồng khách hàng

### 5.1 Trang `/shop`

- Tab lọc theo `category` qua query `?c=apparel|hat|mug|accessory|tech|account`. Với `tech` có thêm lọc `?cond=new|like_new|used`.
- Thẻ sản phẩm (`ProductCard`) hiện: ảnh bìa (`ProductCover`), giá "từ X đ" khi các biến thể có giá khác nhau, badge tình trạng (với đồ công nghệ), badge "Hết hàng" khi mọi biến thể active đều hết.
- Nút trên thẻ: đồ có nhiều biến thể thì là "Chọn mua", dẫn tới trang chi tiết. Đồ chỉ có 1 biến thể thì thêm thẳng vào giỏ.

### 5.2 Trang chi tiết `/shop/[slug]`

- Gallery gồm ảnh bìa và `gallery[]`, có ảnh thumbnail bấm để đổi ảnh chính.
- Nhóm nút chọn biến thể. Giá, giá gạch ngang và "Còn N" thay đổi theo biến thể đang chọn. Biến thể hết hàng bị làm mờ và không chọn được.
- Khối "Tình trạng" (khi có `condition`), khối "Bảo hành" (khi có `warrantyNote`), khối "Giao hàng" (đồ vật lý: "Phí ship tính theo tỉnh khi thanh toán"; tài khoản: "Nhận qua email sau khi thanh toán" hoặc "Bàn giao trong X giờ").
- Có chọn số lượng. Tài khoản số giới hạn tối đa 5 mỗi dòng.
- Hàng `DOWNLOAD` trong Shop giữ nguyên hiển thị như hiện tại.

### 5.3 Giỏ hàng (`src/hooks/use-cart.ts`)

- Kiểu item đổi thành `{ productId, variantId?, qty }`. Khóa nhận diện một dòng là `productId + variantId`.
- Tăng `version` của zustand persist lên, và viết hàm `migrate` để item cũ có `variantId = undefined`. Khi validate, server tự gắn biến thể mặc định (biến thể active có `sortOrder` nhỏ nhất).
- `/api/cart/validate` trả thêm: tên biến thể, giá, tồn kho còn lại, `type`, cờ `requiresShipping`.

### 5.4 Checkout `/checkout`

- Trường luôn có: email, họ tên, số điện thoại (định dạng VN: `^(0|\+84)\d{9}$`).
- Khi giỏ có hàng `PHYSICAL`: thêm tỉnh/thành (dropdown 34 tỉnh), địa chỉ chi tiết, ghi chú. Chọn tỉnh xong sẽ gọi `/api/shipping/quote` để lấy phí ship và hiển thị.
- Phương thức thanh toán: "Chuyển khoản/QR (PayOS)" luôn có. "COD" chỉ hiện khi **mọi** item đều là `PHYSICAL`.
- Tóm tắt đơn: tạm tính, giảm giá, phí ship (hoặc "Miễn phí"), tổng tiền.

### 5.5 `/api/checkout` (server)

Tất cả chạy trong **một** `db.$transaction`:

1. Validate input bằng zod (thêm `variantId`, `paymentMethod`, `phone`, `shipping`).
2. Tải các biến thể active của sản phẩm Shop `ACTIVE`. Từ chối nếu: có hàng `PHYSICAL` mà thiếu địa chỉ; chọn `COD` mà giỏ có hàng không phải `PHYSICAL`.
3. Tính giá phía server: `calculatePricing` nhận thêm giá theo biến thể, rồi `shippingFeeVnd = quoteShipping(province, subtotalPhysicalAfterDiscount)`. Ngưỡng freeship so với tạm tính của hàng vật lý sau khi trừ giảm giá.
4. Giữ chỗ tồn kho:
   - Biến thể có `stock` khác null: chạy `UPDATE "ProductVariant" SET stock = stock - qty WHERE id = ? AND stock >= qty`. Nếu 0 dòng bị ảnh hưởng thì rollback và trả lỗi "Biến thể X chỉ còn N".
   - Tài khoản `AUTO`: chọn `qty` dòng `AVAILABLE` bằng `SELECT … FOR UPDATE SKIP LOCKED` (raw query), rồi chuyển sang `RESERVED`, gán `orderItemId` và `reservedUntil = expiresAt`.
5. Tạo `Order`:
   - COD: `status = PENDING`, `fulfillmentStatus = PENDING`, `expiresAt = null`.
   - PayOS: `status = PENDING`, `expiresAt = now + 30 phút`, tạo link PayOS. `fulfillmentStatus = PENDING` nếu đơn có hàng `PHYSICAL` hoặc `ACCOUNT`.
   - Đơn 0 đ: xử lý như webhook "đã thanh toán" ngay lập tức.
6. Sau khi commit: gửi email "Đã nhận đơn" cho khách (với COD) và email thông báo cho `ADMIN_NOTIFY_EMAIL`.

### 5.6 Webhook PayOS đã thanh toán (`/api/webhooks/payos`)

Giữ nguyên cơ chế chống xử lý lặp (idempotent) theo `providerEventId`. Sau khi chuyển đơn sang `PAID`, xử lý từng item theo `productTypeSnapshot`:

- `DOWNLOAD`: tạo license như hiện tại.
- `ACCOUNT` + `AUTO`: các `AccountStock` đang `RESERVED` của item chuyển sang `DELIVERED` và gán `deliveredAt`. Gửi email chứa thông tin tài khoản (được giải mã, có ghi log `EMAIL`).
- `ACCOUNT` + `MANUAL`: giữ `fulfillmentStatus = PENDING` và email báo admin "Cần bàn giao".
- `PHYSICAL`: `fulfillmentStatus = CONFIRMED`.
- Đơn chỉ gồm tài khoản `AUTO` và `DOWNLOAD`: `fulfillmentStatus = DELIVERED` luôn.

### 5.7 Hết hạn và hủy

- Cron `/api/cron/expire-orders` (đã có) được mở rộng: với đơn PayOS `PENDING` đã quá `expiresAt`, đổi sang `EXPIRED`, cộng lại `stock`, và đưa `AccountStock` `RESERVED` về `AVAILABLE` (xóa `orderItemId` và `reservedUntil`).
- Hàm dùng chung `releaseOrderInventory(tx, orderId)` phục vụ cả cron lẫn admin khi hủy đơn.

### 5.8 Khách xem đơn

- `/account` và trang tra cứu đơn hiện có (mã đơn + email) hiển thị: trạng thái thanh toán, trạng thái giao, mã vận đơn, danh sách hàng kèm biến thể.
- Tài khoản đã bàn giao: nút "Xem thông tin tài khoản" gọi một API riêng. API này kiểm tra quyền (user sở hữu đơn, hoặc mã đơn + email khớp và có rate-limit), giải mã và ghi log `CUSTOMER_VIEW`.

## 6. Admin

### 6.1 Form sản phẩm Shop

File: `src/components/admin/product-form.tsx`. Tách phần đặc thù Shop ra các component con trong `src/components/admin/shop/`:

- `ProductTypePicker`: Đồ vật lý / Tài khoản số / File tải về. Chỉ đổi được khi sản phẩm chưa có đơn hàng nào.
- `ShopDetailsSection`: danh mục, tình trạng và ghi chú tình trạng (chỉ khi danh mục là `TECH`), bảo hành, cách bàn giao (chỉ khi loại là `ACCOUNT`).
- `GalleryPicker`: upload nhiều ảnh (dùng `uploadCoverImage` sẵn có), sắp thứ tự bằng nút ↑/↓, xóa ảnh.
- `VariantTable`: các dòng Tên · Giá · Giá gạch · Tồn kho · SKU · Active, có thêm và xóa dòng. Nút "Tạo nhanh" nhận 2 trường (ví dụ Size, Màu) với giá trị cách nhau bằng dấu phẩy, sinh tổ hợp các dòng và bỏ qua dòng đã tồn tại. Với tài khoản `AUTO`, cột Tồn kho chỉ hiện số tài khoản còn trống trong kho, không cho nhập.
- Biến thể được gửi lên dưới dạng JSON trong một field ẩn `variants`. `saveProduct` validate bằng zod và upsert theo `id`. Biến thể bị xóa khỏi form mà đã có đơn hàng thì chuyển `active = false` thay vì xóa hẳn.
- Nút Lưu nháp / Đăng giữ nguyên. Điều kiện để Đăng: có ít nhất 1 biến thể active có giá > 0 (trừ `FREE`). Riêng `DOWNLOAD` có mức giá thì phải có file như hiện tại.
- Source Code form không đổi: ẩn toàn bộ các phần đặc thù Shop khi `kind = SOURCE_CODE`.

### 6.2 Kho tài khoản

Là một tab/section trong trang sửa sản phẩm, chỉ hiện khi `type = ACCOUNT` và `deliveryMode = AUTO`:

- Nhập hàng loạt: chọn biến thể rồi dán vào textarea, mỗi dòng là một tài khoản. Nội dung dòng được lưu nguyên văn sau khi mã hóa, ví dụ `email|mật khẩu|ghi chú`. Bỏ qua dòng trống. Báo kết quả "Đã thêm N".
- Bảng: biến thể, trạng thái, mã đơn (nếu có), ngày nhập, ngày giao. Nút 👁 để giải mã từng dòng (có ghi log `ADMIN_VIEW`). Xóa được dòng `AVAILABLE`.
- Bảo hành: trên dòng `DELIVERED` có nút "Đổi tài khoản". Hệ thống chuyển dòng cũ sang `REVOKED`, lấy một dòng `AVAILABLE` cùng biến thể gán cho `orderItem`, rồi email khách.

### 6.3 Khu vực ship: `/admin/shop/shipping`

- Thêm mục trên sidebar: "Phí ship".
- CRUD `ShippingZone`: chọn nhiều tỉnh bằng checkbox (34 tỉnh), sửa phí và ngưỡng freeship. Khu `isDefault` không có nút xóa và không cần chọn tỉnh.
- Tỉnh đã thuộc khu khác sẽ có chú thích "(đang ở khu X)".

### 6.4 Đơn hàng

- `/admin/orders`: thêm bộ lọc `payment` (PENDING/PAID/COD), `fulfillment` (theo từng trạng thái), `type` (PHYSICAL/ACCOUNT/DOWNLOAD). Thêm badge "Cần xử lý" = số đơn có `fulfillmentStatus IN (PENDING, CONFIRMED)` và (đơn đã `PAID` hoặc là `COD`).
- Trang mới `/admin/orders/[id]`:
  - Thông tin khách (có nút copy địa chỉ), danh sách hàng kèm biến thể, tạm tính, giảm giá, phí ship, tổng tiền, phương thức thanh toán.
  - Hành động theo trạng thái:
    - `PENDING` (đồ vật lý): "Xác nhận đơn" → `CONFIRMED`.
    - `CONFIRMED`: "Giao hàng" (nhập mã vận đơn, không bắt buộc) → `SHIPPING`.
    - `SHIPPING`: "Đã giao" → `DELIVERED`. Nếu là đơn COD thì cùng lúc đổi `status = PAID` và gán `paidAt`.
    - Item tài khoản `MANUAL` chưa giao: có textarea nhập thông tin và nút "Bàn giao" (mã hóa, lưu vào `deliveredCredentials`, email khách). Khi mọi item đã giao, đơn chuyển sang `DELIVERED`.
    - "Hủy đơn" (hiện khi chưa `DELIVERED`): hỏi xác nhận, gọi `releaseOrderInventory`, rồi đổi `fulfillmentStatus = CANCELLED`. Đơn PayOS chưa trả tiền thì `status = FAILED`. Đơn đã trả tiền thì cảnh báo "Cần hoàn tiền thủ công".
  - Mỗi lần đổi trạng thái sẽ email cho khách (bỏ qua, không báo lỗi, nếu chưa cấu hình Resend).
- Mọi server action đều gọi `requireProductAdmin()`.

### 6.5 Email (`src/lib/mail.ts`)

Thêm các hàm: `sendOrderReceivedEmail`, `sendOrderStatusEmail`, `sendAccountDeliveryEmail`, `sendAdminNewOrderEmail`. Env mới: `ADMIN_NOTIFY_EMAIL` (không bắt buộc).

## 7. Cấu hình

Thêm vào `.env.example` và `src/config/env.ts`:

```env
ACCOUNT_ENCRYPTION_KEY=""   # openssl rand -base64 32
ADMIN_NOTIFY_EMAIL=""
```

## 8. Migration và tương thích

1. Tạo 1 migration: thêm enum, cột, bảng mới.
2. Chạy SQL backfill trong cùng migration:
   - Mọi `Product` hiện có: `type = 'DOWNLOAD'`.
   - Với mỗi `Product`, tạo 1 `ProductVariant` "Mặc định" với giá hiện tại.
   - Với mỗi `OrderItem` cũ: `variantId` = biến thể mặc định của sản phẩm đó, `productTypeSnapshot = 'DOWNLOAD'`.
3. Seed 3 `ShippingZone`.
4. Luồng Source Code và các đơn/license cũ phải chạy như trước.

## 9. Kiểm thử

Unit test (vitest, `tests/unit/`):

- `quoteShipping`: đúng khu theo tỉnh, rơi về khu mặc định, freeship đúng ngưỡng, và khi tỉnh thuộc nhiều khu thì chọn khu có `sortOrder` nhỏ nhất.
- `calculatePricing` với biến thể + coupon + phí ship (coupon không trừ vào ship).
- `encryptCredentials`/`decryptCredentials`: giải mã lại ra đúng bản gốc, báo lỗi khi dữ liệu bị sửa (tag sai), báo lỗi khi thiếu khóa.
- Sinh tổ hợp biến thể "Tạo nhanh".
- Validate checkout: COD bị từ chối khi giỏ có tài khoản số; thiếu địa chỉ khi có đồ vật lý thì báo lỗi.

Integration test (DB thật qua Docker Postgres nếu có, không thì kiểm tra thủ công):

- Hai checkout cùng lúc cho biến thể `stock = 1`: chỉ 1 đơn thành công.
- Đơn PayOS tài khoản `AUTO`: giả lập webhook, kiểm tra dòng kho chuyển sang `DELIVERED` và email được gọi.
- Cron hết hạn trả lại tồn kho và tài khoản đang giữ.

Thủ công: đơn COD áo "Đen / M" đi hết vòng đời; đơn Netflix `MANUAL` được bàn giao; cả 3 loại sản phẩm hiển thị đúng trên mobile.

## 10. Giai đoạn triển khai

Mỗi giai đoạn chạy được độc lập và có thể deploy ngay:

1. **Dữ liệu + catalog**: migration, `ProductVariant`, form admin (loại hàng, chi tiết Shop, gallery, biến thể), `/shop` có lọc, trang chi tiết có chọn biến thể, giỏ hàng có biến thể. Checkout lúc này vẫn chỉ nhận PayOS và hàng không cần ship. Hàng `PHYSICAL` hiện được, nhưng nút mua báo "Sắp mở bán" cho tới giai đoạn 2. Hàng `ACCOUNT` cũng vậy cho tới giai đoạn 3.
2. **Đồ vật lý**: `ShippingZone` + admin phí ship, checkout có địa chỉ/COD/phí ship, giữ chỗ tồn kho, cron trả tồn kho, `/admin/orders/[id]` với các trạng thái giao hàng, email trạng thái.
3. **Tài khoản số**: module mã hóa, `AccountStock` + admin kho, bàn giao `AUTO` trong webhook, bàn giao `MANUAL` trong admin, khách xem tài khoản, log truy cập.
