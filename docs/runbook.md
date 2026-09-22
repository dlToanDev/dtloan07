# RUNBOOK VẬN HÀNH & XỬ LÝ SỰ CỐ PRODUCTION

Tài liệu này dùng để ứng cứu sự cố (incident response), diễn tập phục hồi và vận hành hệ thống Blog & Cửa hàng số.

---

## 1. Kiểm tra trạng thái hệ thống nhanh (Health check)

```bash
# Kiểm tra PM2 Process
pm2 status
pm2 logs blog --lines 50

# Kiểm tra Nginx & SSL
sudo systemctl status nginx
sudo nginx -t

# Kiểm tra UFW Firewall
sudo ufw status verbose

# Kiểm tra RAM & Swap
free -h
top -b -n 1 | head -n 20
```

---

## 2. Các kịch bản sự cố & Cách xử lý

### 2.1 Web sập (HTTP 502 Bad Gateway / Connection Refused)

**Nguyên nhân thường gặp:**

- Tiến trình Node.js (Next.js) bị crash hoặc OOM (Out Of Memory).
- PM2 không tự restart.

**Cách khắc phục:**

```bash
# 1. Xem log lỗi gần nhất
pm2 logs blog --lines 100 --err

# 2. Khởi động lại Next.js an toàn (zero-downtime reload)
pm2 reload blog --update-env

# Nếu vẫn không lên, restart cưỡng chế:
pm2 restart blog

# 3. Kiểm tra xem port 3000 đã phản hồi chưa
curl -I http://127.0.0.1:3000
```

---

### 2.2 Sự cố Database (Prisma / Supabase Pooler P1001)

**Triệu chứng:** Lỗi `P1001: Can't reach database server` hoặc quá tải pooler connection.

**Cách khắc phục:**

1. Kiểm tra biến `DATABASE_URL` trong `.env`:
   - Phải sử dụng hostname Session Pooler IPv4: `aws-0-ap-northeast-1.pooler.supabase.com:5432` với user `postgres.[project-ref]`.
   - Không sử dụng Direct Connection (`db.[ref].supabase.co`) vì chỉ có IPv6.
2. Kiểm tra trạng thái dịch vụ trên Supabase Dashboard.
3. Chạy kiểm tra kết nối:
   ```bash
   pnpm prisma db execute --stdin <<< "SELECT 1;"
   ```

---

### 2.3 Webhook PayOS không kích hoạt đơn hàng

**Triệu chứng:** Khách đã chuyển tiền quét mã VietQR thành công nhưng đơn vẫn ở trạng thái `PENDING`.

**Cách xử lý:**

1. Đăng nhập trang Admin: `/admin/orders`
2. Kiểm tra log hệ thống:
   ```bash
   grep -i "payos" /var/www/blog/logs/out.log | tail -n 30
   ```
3. Xem lý do bị từ chối:
   - _Chữ ký không hợp lệ:_ Kiểm tra lại `PAYOS_CHECKSUM_KEY` trong `.env`.
   - _Số tiền không khớp:_ Xem log `CẢNH BÁO GIAN LẬN: Số tiền thanh toán không khớp`.
4. Nếu khách đã thanh toán đúng nhưng webhook bị rớt mạng:
   - Vào `/admin/orders`, chọn đơn hàng và kích hoạt trạng thái `PAID` thủ công trong Database hoặc cấp License tại `/admin/licenses`.

---

### 2.4 Hết dung lượng đĩa cứng (Disk Full)

**Cách xử lý:**

```bash
# Xem dung lượng ổ đĩa
df -h

# Dọn dẹp PM2 logs
pm2 flush

# Xoá cache Next.js build cũ nếu cần
rm -rf /var/www/blog/.next/cache

# Dọn dẹp pnpm cache
pnpm store prune
```

---

## 3. Quy trình Deploy & Rollback

### 3.1 Deploy phiên bản mới (`scripts/deploy.sh`)

```bash
cd /var/www/blog
git pull origin main
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 reload blog --update-env
pm2 save
```

### 3.2 Rollback tức thì khi bản deploy mới có lỗi (Emergency Rollback)

```bash
cd /var/www/blog

# 1. Quay về commit ổn định trước đó
git log --oneline -n 5
git reset --hard <COMMIT_HASH_TRUOC_DO>

# 2. Build lại và reload
pnpm install --frozen-lockfile
pnpm build
pm2 reload blog --update-env
```

---

## 4. Sao lưu & Phục hồi Database (Backup & Restore)

### 4.1 Sao lưu tự động qua script:

```bash
bash scripts/backup-db.sh
```

### 4.2 Phục hồi (Restore) khi gặp thảm hoạ:

```bash
# Giải nén và nạp lại vào Database
gunzip -c ~/backups/blog_2026-09-16.sql.gz | psql "$DATABASE_URL"
```
