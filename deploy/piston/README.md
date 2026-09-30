# Máy chấm code (Piston)

Khóa học trên web chấm bài tập bằng [Piston](https://github.com/engineer-man/piston) chạy trong
Docker ngay trên VPS (Ubuntu 24.04). Code học viên chạy trong sandbox riêng: không có mạng, giới
hạn thời gian / RAM từng lần chạy; cả container bị giới hạn 2 CPU / 3 GB để web luôn còn tài nguyên.

> Không dùng Judge0 vì bản ổn định cần cgroup v1 — trên Ubuntu 24.04 phải sửa GRUB và khởi động
> lại VPS.

## Cài lần đầu

```bash
# 1. Cài Docker (nếu chưa có)
curl -fsSL https://get.docker.com | sh

# 2. Chép thư mục này lên VPS, ví dụ /opt/piston
sudo mkdir -p /opt/piston && sudo cp docker-compose.yml install-languages.sh /opt/piston/
cd /opt/piston

# 3. Chạy máy chấm (tự khởi động lại khi VPS reboot)
sudo docker compose up -d

# 4. Cài ngôn ngữ C/C++, Python, JavaScript, Java (~1–2 GB, chạy một lần)
./install-languages.sh
```

Thêm vào `.env` của web rồi khởi động lại web (`pm2 restart blog`):

```bash
PISTON_URL="http://127.0.0.1:2000"
```

## Kiểm tra

```bash
curl -s http://127.0.0.1:2000/api/v2/runtimes           # danh sách ngôn ngữ đã cài
curl -s -X POST http://127.0.0.1:2000/api/v2/execute -H 'Content-Type: application/json' \
  -d '{"language":"python","version":"*","files":[{"content":"print(1+1)"}]}'
```

Từ máy dev có thể chạy test chấm thật:

```bash
PISTON_URL=http://127.0.0.1:2000 pnpm test:int tests/integration/judge-piston.test.ts
```

## Lưu ý

- Cổng 2000 chỉ mở trên `127.0.0.1`. **Không** mở ra Internet: ai gọi được Piston là chạy được code
  trên VPS.
- Dữ liệu ngôn ngữ nằm ở `/opt/piston/data`; xóa container không mất, không cần cài lại.
- Cập nhật Piston: `sudo docker compose pull && sudo docker compose up -d`.
- Cấu hình liên quan trong code: `src/lib/judge/languages.ts` (giới hạn thời gian, thời gian khởi
  động cộng thêm cho Java / Python), `src/lib/judge/runner.ts` (tối đa 4 lần chạy cùng lúc).
