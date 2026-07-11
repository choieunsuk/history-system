# 역사자료부 자료이관 시스템 - Dockerfile
# 시놀로지 NAS Container Manager 배포용
# 다중 스테이지: deps → 빌드 → 런타임 (이미지 크기 최소화)

# ─── Stage 1: deps ──────────────────────────────────────────────────────────
FROM oven/bun:1.1 AS deps
WORKDIR /app

# package.json과 lockfile만 먼저 복사 (캐시 최적화)
COPY package.json bun.lock* ./
COPY prisma ./prisma

# 의존성 설치 (production deps를 별도로 보관하기 위해 전체 설치 후 추출)
RUN bun install --frozen-lockfile

# ─── Stage 2: builder ───────────────────────────────────────────────────────
FROM oven/bun:1.1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 클라이언트 생성
RUN bun run db:generate

# Next.js standalone 빌드
# - output: "standalone" 설정으로 .next/standalone에 자체 포함 서버 생성
# - .next/static, public 은 별도 복사 필요
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ─── Stage 3: runtime ───────────────────────────────────────────────────────
# 시놀로지 NAS(대부분 x86-64, 일부 ARM) 호환을 위해 linux/amd64 명시
# 런타임은 가벼운 node alpine 사용 (Bun 런타임보다 범용적)
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 보안: non-root 사용자로 실행 (시놀로지 권장)
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 서버 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI 복사 (db push 로 스키마 적용 위해)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Entrypoint 스크립트
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# 업로드 디렉토리 (볼륨 마운트 지점)
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

# 데이터베이스 디렉토리 (SQLite 파일 저장 — 영속화 필수)
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

# 환경 변수 기본값 (docker-compose / 시놀로지에서 오버라이드)
ENV DATABASE_URL="file:/app/db/custom.db"

USER nextjs

EXPOSE 3000

# 헬스체크 (시놀로지 Container Manager에서 사용)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Entrypoint: db push 후 서버 실행
ENTRYPOINT ["./docker-entrypoint.sh"]
