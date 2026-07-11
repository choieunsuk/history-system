# 역사자료부 자료이관 시스템 — 시놀로지 NAS 배포 가이드

MS-SQL + ASP.NET 기반 시스템을 Next.js로 이관. 시놀로지 NAS의 Container Manager(Docker)로 배포하는 가이드입니다.

## 사전 준비

### 1. 시놀로지 패키지 설치
- **Container Manager** (패키지 센터 → 검색 → 설치)
  - DSM 7.2 이상 권장 (구 Docker 패키지는 지원 종료)

### 2. 시스템 요구사항
| 항목 | 최소 | 권장 |
|------|------|------|
| CPU | x86-64 (Intel/AMD) | x86-64 |
| ARM | ARMv8 지원 (DS220+ 등은 x86) | — |
| RAM | 1GB 여유 | 2GB 여유 |
| 저장공간 | 1GB | 5GB (업로드 파일 포함) |
| DSM 버전 | 7.0 | 7.2+ |

---

## 배포 방법 (2가지)

### 방법 A: Container Manager 프로젝트 기능 (권장, GUI)

가장 간단한 방법입니다.

1. **소스 파일 업로드**
   - File Station에서 프로젝트 폴더 생성: `/volume1/docker/history-archives/`
   - 프로젝트 소스 전체를 해당 폴더에 업로드
     - `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`
     - `src/`, `prisma/`, `public/`, `package.json`, `bun.lock`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`
   - `node_modules`, `.next`, `.git`는 업로드 **불필요** (빌드 시 생성)

2. **Container Manager → 프로젝트 → 생성**
   - 이름: `history-archives`
   - 경로: `/volume1/docker/history-archives`
   - 소스: `docker-compose.yml` 파일 사용
   - 빌드 및 시작 클릭

3. **접속 확인**
   - `http://NAS_IP:3100` 접속
   - 역사자료부 자료이관 시스템 화면 표시 확인

### 방법 B: SSH 접속 후 명령어 (고급)

```bash
# SSH 접속
ssh admin@NAS_IP

# 프로젝트 폴더로 이동
cd /volume1/docker/history-archives

# 빌드 및 백그라운드 실행
sudo docker compose up -d --build

# 로그 확인
sudo docker compose logs -f history-archives

# 중지
sudo docker compose down

# 이미지 재빌드 (소스 변경 시)
sudo docker compose up -d --build
```

---

## 데이터 영속화 (중요)

`docker-compose.yml`에 정의된 볼륨 2개는 컨테이너 재생성/업데이트 시에도 데이터가 유지됩니다:

| 볼륨 | 컨테이너 경로 | 용도 |
|------|---------------|------|
| `db-data` | `/app/db` | SQLite 데이터베이스 (`custom.db`) |
| `uploads-data` | `/app/public/uploads` | 대표사진, QR 코드, 첨부파일 |

> ⚠️ **백업**: `/volume1/@docker/volumes/` 아래 볼륨 데이터를 주기적으로 백업하세요.
> 또는 Synology Hyper Backup으로 Docker 폴더 전체 백업 권장.

---

## 외부 접속 설정

### 1. 포트 포워딩 (라우터)
- 외부 포트(예: 80/443) → NAS 포트 3100

### 2. 시놀로지 역방향 프록시 (HTTPS 권장)
- **제어판 → 로그인 포털 → 고급 → 역방향 프록시 → 생성**
  - 소스: `https://archives.your-church.kr` (443)
  - 대상: `http://localhost:3100`
- 인증서: Let's Encrypt (제어판 → 인증서 → 자동 갱신)

### 3. 환경 변수 추가 (역방향 프록시 사용 시)
`docker-compose.yml`의 environment 섹션에 추가:
```yaml
environment:
  - NEXTAUTH_URL=https://archives.your-church.kr
```

---

## 초기 데이터 시드 (선택)

처음 배포 후 데모 데이터를 넣으려면:

```bash
# 컨테이너 내부에서 시드 실행
docker exec -it history-archives sh -c "cd /app && node node_modules/prisma/build/index.js db seed"
```

> 참고: 시드 스크립트는 prisma/seed.ts에 정의. 자료 50건 + 첨부파일 생성.
> 실 운영에서는 시드 없이 빈 DB로 시작하세요.

---

## 운영 관리

### 로그 확인
```bash
# 실시간 로그
docker compose logs -f history-archives

# 최근 100줄
docker compose logs --tail 100 history-archives
```

### 컨테이너 재시작
```bash
docker compose restart history-archives
```

### 업데이트 (소스 변경 후)
```bash
cd /volume1/docker/history-archives
git pull  # 또는 파일 재업로드
docker compose up -d --build
```

### DB 백업/복구
```bash
# 백업
docker cp history-archives:/app/db/custom.db ./backup-$(date +%Y%m%d).db

# 복구
docker cp ./backup-20260711.db history-archives:/app/db/custom.db
docker compose restart history-archives
```

### 업로드 파일 백업
```bash
# 백업
docker cp history-archives:/app/public/uploads ./uploads-backup

# 복구
docker cp ./uploads-backup/. history-archives:/app/public/uploads/
```

---

## 문제 해결

### 컨테이너가 시작되지 않는 경우
```bash
# 로그 확인
docker compose logs history-archives

# 포트 충돌 시: docker-compose.yml의 ports 변경
ports:
  - "3200:3000"  # 3100 → 3200
```

### DB 에러 (table does not exist)
- 컨테이너 시작 시 자동으로 `prisma db push` 실행됨
- 수동 실행:
  ```bash
  docker exec -it history-archives sh -c "node node_modules/prisma/build/index.js db push --skip-generate"
  ```

### 업로드 권한 에러
- 볼륨 권한 확인:
  ```bash
  docker exec -it history-archives ls -la /app/public/uploads
  ```
- nextjs 사용자(UID 1001)가 쓰기 권한 필요

### 메모리 부족
- `docker-compose.yml`의 메모리 제한 조정:
  ```yaml
  deploy:
    resources:
      limits:
        memory: 1G  # 512M → 1G
  ```

---

## 아키텍처

```
시놀로지 NAS
├── Container Manager (Docker)
│   └── history-archives 컨테이너
│       ├── Next.js 16 standalone server (port 3000)
│       ├── Prisma + SQLite (/app/db/custom.db)
│       └── 업로드 파일 (/app/public/uploads/)
│
├── 볼륨 (영속화)
│   ├── db-data → SQLite DB
│   └── uploads-data → 업로드 파일
│
└── 역방향 프록시 (HTTPS)
    └── archives.your-church.kr → localhost:3100
```

---

## 보안 체크리스트

- [ ] DSM 계정 2단계 인증 활성화
- [ ] 방화벽에서 3100 포트 외부 차단 (역방향 프록시만 사용)
- [ ] HTTPS 인증서 적용 (Let's Encrypt)
- [ ] 정기적 DB/업로드 백업 설정 (Hyper Backup)
- [ ] DSM 자동 업데이트 활성화
- [ ] 컨테이너 자동 재시작 확인 (`restart: unless-stopped` 설정됨)
