#!/bin/sh
# 역사자료부 자료이관 시스템 - Docker Entrypoint
# 컨테이너 시작 시 DB 스키마 적용 후 서버 실행

set -e

echo "[entrypoint] 역사자료부 자료이관 시스템 시작 중..."

# 1) 데이터베이스 스키마 적용 (SQLite 파일이 없으면 생성)
#    prisma db push 는 idempotent — 이미 스키마가 있으면 변경 없음
echo "[entrypoint] 데이터베이스 스키마 적용 중..."
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 || {
  echo "[entrypoint] ⚠️  db push 실패 — 기존 DB로 계속 진행합니다."
}

# 2) Prisma 클라이언트 캐시 워밍 (옵션)
echo "[entrypoint] Prisma 클라이언트 준비 완료"

# 3) 서버 실행
echo "[entrypoint] Next.js 서버 시작 (포트 ${PORT:-3000})"
exec node server.js
