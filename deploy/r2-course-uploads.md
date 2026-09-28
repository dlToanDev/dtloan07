# Cloudflare R2 cho video / tài liệu khóa học

Video bài giảng (tối đa 5 GB), slide PDF (100 MB) và tài liệu (500 MB) được **trình duyệt upload
thẳng lên R2** theo từng phần 16 MB qua link ký sẵn — server web không trung chuyển dữ liệu. Học
viên xem / tải qua `/api/courses/files/...`: web kiểm tra quyền học rồi chuyển sang link R2 có hạn
(video 4 giờ, file khác 1 giờ). Bucket để **private**, không bật public access.

## 1. Biến môi trường (`.env` của web)

```bash
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."          # API token quyền Object Read & Write cho bucket
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="ten-bucket"
```

## 2. CORS của bucket (bắt buộc cho upload từ trình duyệt)

Cloudflare Dashboard → R2 → bucket → **Settings → CORS Policy → Add CORS policy**, dán (đổi tên miền):

```json
[
  {
    "AllowedOrigins": ["https://ten-mien-cua-ban.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`ExposeHeaders: ETag` là bắt buộc — thiếu nó trang admin báo "Không đọc được ETag".

## 3. Dọn phần upload dở (khuyên dùng)

R2 → bucket → **Settings → Object lifecycle rules → Add rule**: "Abort incomplete multipart
uploads" sau **1 ngày**. Upload bị đóng tab giữa chừng sẽ không chiếm chỗ.

## Ghi chú

- Nên xuất video MP4 (H.264 + AAC) để mọi trình duyệt phát được; 720p ~ 1–1,5 GB/giờ.
- R2 không tính phí băng thông tải ra; chỉ tính dung lượng lưu trữ.
- Test upload ở máy dev không cần R2: chạy một kho S3 local (vd. SeaweedFS) rồi đặt
  `R2_ENDPOINT="http://127.0.0.1:8333"` (xem `tests/integration/course-uploads.test.ts`).
