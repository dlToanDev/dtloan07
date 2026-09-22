#!/usr/bin/env bash
#
# Backup PostgreSQL. Chạy bằng cron:
#   0 2 * * * /var/www/blog/scripts/backup-db.sh >> /home/deploy/backup.log 2>&1
#
set -euo pipefail

DB_NAME="${DB_NAME:-blog_db}"
DB_USER="${DB_USER:-blog_user}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/${DB_NAME}_$(date +%F_%H%M).sql.gz"

echo "[$(date -Is)] Bắt đầu backup -> $FILE"
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

# File rỗng nghĩa là pg_dump hỏng — xoá ngay để không tưởng nhầm là đã có backup.
if [[ ! -s "$FILE" ]]; then
  echo "❌ Backup rỗng, xoá file và báo lỗi"
  rm -f "$FILE"
  exit 1
fi

echo "    Kích thước: $(du -h "$FILE" | cut -f1)"

# Đẩy lên R2. Backup nằm cùng máy với DB thì không phải backup.
if command -v rclone > /dev/null && rclone listremotes | grep -q '^r2:'; then
  rclone copy "$FILE" r2:blog-backups/
  echo "    Đã đẩy lên R2"
else
  echo "    ⚠️  Chưa cấu hình rclone — backup mới chỉ nằm trên chính VPS này."
fi

find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+$KEEP_DAYS" -delete
echo "[$(date -Is)] Xong"
