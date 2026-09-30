# Đăng source code và file tải

Chạy `pnpm exec prisma migrate deploy` trên database đích trước khi chạy phiên bản này, sau đó `pnpm exec prisma generate` khi build.

Quản lý mã nguồn app/tool tại `/admin/source-code`; quản lý sản phẩm Shop tại `/admin/shop`. Mỗi mục có danh sách riêng. Bấm **Đăng mới** để mở trang soạn nội dung, hoặc **Chỉnh sửa** trong danh sách để sửa trên trang riêng. Trang soạn có vùng nội dung rộng và cột Xuất bản / Giá bán / File tải về. Đường dẫn tự tạo từ tiêu đề và có thể chỉnh lại. Chọn Bản nháp hoặc Công khai rồi bấm **Lưu thay đổi**. Sau lần lưu đầu tiên, trang chuyển sang chỉnh sửa sản phẩm vừa tạo.

- **Miễn phí**: giá 0, khách tải trực tiếp, không cần tài khoản hay thanh toán.
- **Trả phí – Liên hệ báo giá**: hiển thị nút liên hệ đến `/about#lien-he`, không đưa vào checkout.
- **Trả phí – Đặt giá**: nhập giá VND lớn hơn 0; dùng checkout PayOS và quyền tải theo license hiện có.

Upload ZIP hoặc file đính kèm, tối đa 8 MB mỗi lần. File mới được thêm vào danh sách file cũ; tên file và đuôi file được giữ khi tải. Bản miễn phí/đặt giá phải có file trước khi công khai. Có thể lưu bản nháp khi chưa có file.

Cấu hình `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` để upload/tải thực tế. Bucket lưu sản phẩm phải private. Luồng admin từ chối upload khi chưa cấu hình R2, không lưu file giả. Thanh toán thực tế dùng cấu hình PayOS/webhook hiện có trong `.env.example`.

Migration chuyển các sản phẩm giá 0 hiện có sang FREE và các sản phẩm còn lại sang PAID. Chọn CONTACT trong admin cho sản phẩm cần liên hệ.

Chi tiết source dùng `/source-code/[slug]`, chi tiết Shop dùng `/shop/[slug]`. Đường dẫn `/products/[slug]` cũ tự chuyển sang đúng mục. Công cụ Affiliate là các liên kết giới thiệu được quản lý riêng, không phải danh sách source bán.
