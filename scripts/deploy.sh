#!/usr/bin/env bash
#
# Deploy lại trên VPS. Chạy bằng user `deploy`, KHÔNG chạy bằng root.
#   cd /var/www/blog && ./scripts/deploy.sh
#
set -euo pipefail

APP_DIR="/var/www/blog"
BRANCH="${1:-main}"

cd "$APP_DIR"

echo "==> Kiểm tra thư mục làm việc sạch"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Có thay đổi chưa commit trên VPS. Dừng lại để không mất code."
  git status --short
  exit 1
fi

echo "==> Lấy code mới (branch: $BRANCH)"
git fetch --prune origin
PREV_SHA="$(git rev-parse HEAD)"
git reset --hard "origin/$BRANCH"
echo "    $PREV_SHA -> $(git rev-parse HEAD)"

echo "==> Cài dependency"
pnpm install --frozen-lockfile

echo "==> Chạy migration"
# migrate deploy chỉ áp migration đã commit, không tự sinh migration mới.
# KHÔNG BAO GIỜ dùng `migrate dev` hay `db push` trên production.
if [[ -f prisma/schema.prisma ]]; then
  pnpm prisma migrate deploy
fi

echo "==> Build"
# Build xong mới reload. Nếu build fail, bản cũ vẫn đang chạy nguyên vẹn.
pnpm build

echo "==> Reload app (zero-downtime)"
pm2 reload blog --update-env
pm2 save

echo "==> Kiểm tra sức khoẻ"
sleep 3
for i in {1..10}; do
  if curl -sf -o /dev/null http://127.0.0.1:3000; then
    echo "✅ Deploy xong: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo "❌ App không phản hồi sau khi reload. Rollback:"
echo "   git reset --hard $PREV_SHA && pnpm install --frozen-lockfile && pnpm build && pm2 reload blog"
pm2 logs blog --lines 30 --nostream
exit 1
