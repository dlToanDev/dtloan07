# Cẩm nang vận hành VPS `13.140.182.142`

> Mục đích: thêm web mới lên VPS này mà **KHÔNG làm sập 2 web đang chạy**.
> Đọc **Mục 2 (Nguyên tắc vàng)** trước khi deploy bất cứ thứ gì.

Thông tin chung:

- **IP:** `13.140.182.142` · **Nhà cung cấp:** Contabo · **OS:** Ubuntu 24.04 · **Hostname:** `vmi3566548` · **User:** `root`
- **Cổng vào chung (80/443):** do **Nginx hệ thống** (cài bằng apt, `/etc/nginx/`) nắm giữ. Đây là "cửa ngõ" duy nhất, đứng trước và chia traffic cho từng web.

---

## 1. Hiện trạng — đang có gì trên VPS

| Web                        | Công nghệ                                   | Port nội bộ                                  | Domain              | Đường vào                                                                                         |
| -------------------------- | ------------------------------------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| **dltoan07 (blog)**        | Next.js, chạy bằng **PM2** (process `blog`) | `127.0.0.1:3000`                             | `dltoan07.id.vn`    | **Qua Cloudflare** (nhiều khả năng Cloudflare Tunnel → `:3000`). **KHÔNG đi qua Nginx hệ thống.** |
| **Garden Chay (DebtFlow)** | Docker stack tại `/opt/debtflow/son_erc/`   | `127.0.0.1:8443` (web), `api` nội bộ `:3000` | `gardenchay.garden` | **Trỏ thẳng VPS** → Nginx hệ thống → `https://127.0.0.1:8443`                                     |

Các process/container phụ:

- PM2: `blog`, `telegram-bot`
- Docker: `son_erc-nginx-1` (web garden, `127.0.0.1:8080->80`, `127.0.0.1:8443->443`), `son_erc-api-1`, `son_erc-postgres-1`, `son_erc-backup-1`, `blog_postgres` (`0.0.0.0:5433->5432`)

**Cổng host đang bị chiếm:** `80`, `443` (Nginx) · `3000` (blog PM2) · `5433` (blog_postgres) · `8080`, `8443` (garden, chỉ localhost).

---

## 2. ⭐ Nguyên tắc vàng (vi phạm là sập web)

1. **Chỉ Nginx hệ thống được giữ cổng `80` và `443`.**
   Không app nào, không container Docker nào được publish ra `80`/`443`. (Chính lỗi này từng làm sập Garden Chay: container garden đòi cổng 80/443 nhưng Nginx đã chiếm → nó bind fail → chết.)

2. **Mỗi web một port nội bộ riêng, bind `127.0.0.1`.**
   Web mới → chọn 1 port trống (vd. `3001`, `8081`...). App/container chỉ nghe ở `127.0.0.1:<port>`, không mở ra `0.0.0.0`.

3. **Thêm web = THÊM file server block mới. Không sửa block của web cũ.**
   Mỗi domain một file trong `/etc/nginx/sites-available/`, rồi symlink sang `sites-enabled/`.

4. **Luôn `nginx -t` TRƯỚC khi `systemctl reload nginx`.**
   `reload` (không phải `restart`) để không ngắt kết nối. Chỉ reload khi `nginx -t` báo OK.

5. **Backup file trước khi sửa** (`cp file file.bak`), để revert được ngay.

---

## 3. ✅ Checklist thêm web thứ 3 (làm theo đúng thứ tự)

Giả sử web mới domain `vidu.com`, chạy ở port `3001`.

**B1. Chọn port trống** — kiểm tra port chưa ai dùng:

```bash
ss -tlnp | grep -E ':3001|:8081'
```

(Không ra gì = port trống, dùng được.)

**B2. Deploy app, bind CHỈ localhost:**

- Nếu là **Docker**: trong `docker-compose.yml` để `ports: - '127.0.0.1:3001:<port-trong-container>'`
- Nếu là **PM2/Node**: chạy với `HOST=127.0.0.1 PORT=3001`
- ❗ Tuyệt đối không map ra `80`/`443` hay `0.0.0.0`.

**B3. Tạo server block Nginx mới** (xem mẫu ở Mục 4):

```bash
nano /etc/nginx/sites-available/vidu.com
```

**B4. Bật site + kiểm tra cú pháp:**

```bash
ln -s /etc/nginx/sites-available/vidu.com /etc/nginx/sites-enabled/vidu.com
nginx -t
```

**B5. Nếu `nginx -t` OK → reload:**

```bash
systemctl reload nginx
```

**B6. Cấp SSL** (chỉ khi domain trỏ THẲNG vào VPS; nếu dùng Cloudflare thì Cloudflare lo SSL, bỏ qua bước này):

```bash
certbot --nginx -d vidu.com -d www.vidu.com
```

**B7. Kiểm tra cả 3 web vẫn đúng** (xem Mục 5).

---

## 4. 📄 Mẫu server block Nginx cho web mới

Lưu vào `/etc/nginx/sites-available/vidu.com`, thay `vidu.com` và `3001` cho đúng:

```nginx
server {
    listen 80;
    server_name vidu.com www.vidu.com;

    location / {
        proxy_pass http://127.0.0.1:3001;   # <-- port nội bộ của web mới
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> Sau khi chạy `certbot --nginx`, certbot sẽ tự thêm block `listen 443 ssl` + chứng chỉ vào file này.
>
> **Lưu ý đặc biệt:** nếu app mới (giống container garden) tự **ép HTTPS / có SSL riêng** → proxy vào phía `https` của nó và thêm:
>
> ```nginx
>         proxy_pass https://127.0.0.1:8443;
>         proxy_ssl_server_name on;
>         proxy_ssl_name vidu.com;
>         proxy_ssl_verify off;
> ```

---

## 5. 🔍 Lệnh kiểm tra nhanh (health check)

Chạy từng dòng để soi toàn bộ VPS:

```bash
ss -tlnp | grep -E ':80|:443|:3000|:3001|:8080|:8443'   # ai đang giữ cổng nào
```

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"   # container nào sống
```

```bash
pm2 list   # app Node nào sống
```

```bash
nginx -t   # config nginx còn hợp lệ không
```

Kiểm tra từng domain ra đúng web (title phải khớp):

```bash
curl -s https://gardenchay.garden/ | grep -o '<title>[^<]*</title>'   # => Quản lý công nợ Garden Chay
curl -s https://dltoan07.id.vn/   | grep -o '<title>[^<]*</title>'    # => dltoan07 - DevOps...
```

---

## 6. 🚑 Khi có sự cố — xử nhanh

| Triệu chứng                                          | Nguyên nhân thường gặp                       | Cách xử                                                                    |
| ---------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Vào web A lại ra web B                               | `proxy_pass` trong block của A trỏ nhầm port | Sửa đúng port trong `/etc/nginx/sites-available/<A>` → `nginx -t` → reload |
| Container chết, `docker ps -a` thấy **Exited (137)** | **Hết RAM (OOM kill)**                       | `free -h` xem RAM; giảm tải; `docker compose up -d <service>` bật lại      |
| Container không bật lại được                         | Đang đòi cổng đã bị chiếm (vd. 80/443)       | Đổi `ports` của nó sang port nội bộ riêng `127.0.0.1:<port>`               |
| `systemctl reload nginx` không ăn                    | Config có lỗi, hoặc chưa reload              | Chạy `nginx -t`, sửa lỗi; cùng lắm `systemctl restart nginx`               |
| Cần quay về trạng thái cũ                            | Đã sửa hỏng file                             | Khôi phục từ `.bak`: `cp file.bak file` → `nginx -t` → reload              |

**File backup đang có sẵn** (khôi phục khi cần):

- `/opt/debtflow/son_erc/.env.bak`
- `/opt/debtflow/son_erc/docker-compose.prod.yml.bak`
- `/etc/nginx/sites-available/gardenchay.garden.bak`

---

## 7. 📌 Ghi chú riêng của VPS này

- **Terminal hay bị dính dòng khi dán nhiều lệnh một lúc** → luôn dán/chạy **từng lệnh một**, nhất là lệnh `sed`/`cat` nhiều dòng.
- **`dltoan07.id.vn` đi qua Cloudflare**, độc lập hoàn toàn với Nginx hệ thống → sửa Nginx trên VPS **không ảnh hưởng** blog này.
- **`gardenchay.garden` trỏ thẳng VPS** → phụ thuộc Nginx hệ thống + container `son_erc-nginx-1`. Cert của nó: `/etc/letsencrypt/live/gardenchay.garden/`.
- **Mô hình chuẩn của VPS này:** 1 Nginx hệ thống làm cổng chung (80/443) → proxy vào nhiều app, mỗi app 1 port `127.0.0.1` riêng. Giữ đúng mô hình này thì thêm bao nhiêu web cũng không đụng nhau.

---

_Lần cập nhật: 2026-10-04 — sau sự cố gardenchay.garden ra nhầm web dltoan07._
