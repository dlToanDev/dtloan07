#!/usr/bin/env bash
# Cài các ngôn ngữ cho Piston (chạy một lần sau khi container đã lên).
set -euo pipefail
URL="${PISTON_URL:-http://127.0.0.1:2000}"

install() {
  echo "→ Cài $1 $2"
  curl -fsS -X POST "$URL/api/v2/packages" -H 'Content-Type: application/json' \
    -d "{\"language\":\"$1\",\"version\":\"$2\"}"
  echo
}

install gcc 10.2.0      # C và C++
install python 3.12.0
install node 20.11.1    # JavaScript
install java 15.0.2

echo "Đã cài:"
curl -fsS "$URL/api/v2/runtimes" | grep -o '"language":"[^"]*","version":"[^"]*"' || true
