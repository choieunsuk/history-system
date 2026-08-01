#!/bin/sh
# 역사자료부 자료이관 시스템 - Docker Entrypoint
# 컨테이너 시작 시 DB 스키마 적용 후 서버 실행

set -e

echo "[entrypoint] 역사자료부 자료이관 시스템 시작 중..."

# npm 의존성 설치 (Prisma CLI 포함)
if [ ! -d "node_modules/prisma" ]; then
  echo "[entrypoint] npm 의존성 설치 중..."
  HOME=/tmp npm install 2>&1 | tail -5
fi

# 데이터베이스 스키마 적용
echo "[entrypoint] 데이터베이스 스키마 적용 중..."
HOME=/tmp npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "[entrypoint] ⚠️  db push 실패 — 기존 DB로 계속 진행합니다."
}

# 초기 사용자 생성 (사용자가 없으면 한 번만)
echo "[entrypoint] 초기 데이터 확인 중..."
node << 'INIT_SCRIPT'
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');

async function init() {
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("[init] 테스트 계정 생성 중...");
      const hashedPassword = await hash('password123', 10);

      await prisma.user.createMany({
        data: [
          {
            email: 'admin@church.kr',
            name: '관리자',
            password: hashedPassword,
            role: '관리자',
          },
          {
            email: 'editor@church.kr',
            name: '운영자',
            password: hashedPassword,
            role: '운영자',
          },
          {
            email: 'user@church.kr',
            name: '일반사용자',
            password: hashedPassword,
            role: '일반',
          },
        ],
      });

      console.log("[init] ✅ 테스트 계정 생성 완료");
      console.log("[init] 1️⃣  admin@church.kr / password123 (관리자)");
      console.log("[init] 2️⃣  editor@church.kr / password123 (운영자)");
      console.log("[init] 3️⃣  user@church.kr / password123 (일반)");
    } else {
      console.log(`[init] 기존 사용자 ${userCount}명 있음 — 초기화 스킵`);
    }
  } catch (e) {
    console.error('[init] 오류:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

init();
INIT_SCRIPT

# 서버 실행
echo "[entrypoint] Next.js 서버 시작 (포트 ${PORT:-3000})"
exec node server.js
