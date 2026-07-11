# 역사자료부 자료이관 시스템 - Worklog

## 프로젝트 개요
MS-SQL + ASP.NET 기반 역사자료부 자료이관 시스템을 Next.js 16 + Prisma(SQLite)로 단순화 재개발.

## 핵심 요구사항 (PPTX 분석)
- 자료 등록/조회/수정/삭제
- 목록/검색 (자료제목, 소관부서, 공개여부, 자료분류, 기준일자, 자료성격)
- 자료분류 코드: 문서-출판물(0101), 문서-종이(0102), 음영-사진(0201), 음영-음향(0202), 음영-영상(0203), 기물-일반(0301), 기물-기념물(0302), 기물-역사물(0303), 기물-예술품(0304)
- 자료성격: 일반, 예배/설교, 교육/회의, 세미나/워크샵
- 공개여부: 비공개/공개 (일반인은 공개만 조회)
- 대표사진, QR코드(기물자료), 첨부파일(최대10개, PDF 권장), 검색키워드
- 수정자/수정일자 자동 표기
- 권한등급: 교역자, 장로, 안수집사/권사, 서리집사, 등록교인, 일반인

---
Task ID: 3-a
Agent: full-stack-developer (backend)
Task: 역사자료부 자료이관 시스템 — 백엔드 API 8종 구현 (Next.js 16 Route Handlers + Prisma/SQLite)

Work Log:
- 기존 worklog.md, src/lib/constants.ts, prisma/schema.prisma, prisma/seed.ts 읽고 컨텍스트 파악
- src/lib/api-helpers.ts 생성: serializeMaterial (Prisma Material → MaterialRecord 직렬화, Date→ISO, isPublic→boolean), canViewPrivate, buildRoleVisibilityWhere (권한 기반 isPublic 필터), parseDateOnly, endOfDay
- src/app/api/materials/route.ts:
  - GET: q(classification/department/materialCharacter/isPublic/dateFrom/dateTo/page/pageSize/userRole) 필터 지원, 권한 기반 비공개 가림, referenceDate DESC → createdAt DESC 정렬, MaterialListResponse 반환, attachments 포함
  - POST: 필수값 검증(title/content/department/classification/materialCharacter/referenceDate), modifier="시스템", 201 응답
- src/app/api/materials/[id]/route.ts (params Promise await — Next.js 16):
  - GET: 비공개 + 권한 없음 = 403, 없음 = 404
  - PUT: 전달된 필드만 부분 업데이트, modifier="시스템", modifiedDate @updatedAt 자동
  - DELETE: cascade 로 attachment 함께 삭제, { success: true }
- src/app/api/upload/route.ts: multipart/form-data file 필드, crypto.randomUUID()+확장자, 50MB 제한, ALLOWED_FILE_EXTENSIONS 화이트리스트, /uploads/<uuid>.ext 저장, formData() 실패 시 400
- src/app/api/stats/route.ts: total/publicCount/privateCount (권한별 가시성), byCategory(CLASSIFICATION_MAP로 문서/음영/기물 그룹), byCharacter, byMonth(최근 12개월, 0 채움), recentMaterials(5건, attachments 포함)
- src/app/api/code-options/route.ts: CLASSIFICATIONS/MATERIAL_CHARACTERS/PUBLIC_OPTIONS/ROLES 그대로 반환
- 모든 라우트에 `export const dynamic = "force-dynamic"` + `runtime = "nodejs"` 명시
- bun run lint → 에러 0건
- curl 테스트 8종 모두 통과 (응답 예시: GET /api/stats?userRole=일반인 → {"total":34,"publicCount":34,"privateCount":0,...}; GET /api/stats?userRole=교역자 → {"total":50,"publicCount":34,"privateCount":16,...}; POST /api/materials → 201; GET /api/materials/[id] 비공개+일반인 → 403; DELETE → {"success":true}; POST /api/upload → {"url":"/uploads/<uuid>.pdf","fileName":"...","fileType":"...","fileSize":28})

Stage Summary:
백엔드 8개 API 라우트 + 1개 공용 헬퍼 모듈 구현 완료. 권한 기반 가시성 필터링(비공개 자료 숨김), 페이지네이션, 제목/키워드 검색, 분류/성격/부서/공개여부/날짜범위 필터, 통계 집계(카테고리/성격/월별/최근), 파일 업로드(50MB, 확장자 검증) 모두 정상 동작 확인. ESLint 통과, dev.log 500 에러 없음. 프런트엔드 에이전트가 바로 호출 가능한 상태. (상세 기록: /agent-ctx/3-a-full-stack-developer-backend.md)

---

Task ID: 3-b
Agent: full-stack-developer (frontend)
Task: 역사자료부 자료이관 시스템 프론트엔드 SPA 구축 (Next.js 16 App Router, 단일 라우트 `/`)

Work Log:
1. 사전 분석
   - `worklog.md` 및 `src/lib/constants.ts` 선행 작업 확인 (CLASSIFICATIONS, MATERIAL_CHARACTERS, ROLES, CATEGORY_COLORS, MaterialRecord/StatsResponse 등 공유 타입).
   - shadcn/ui 컴포넌트 인벤펙션 (dialog, sheet, table, tabs, select, calendar, popover, dropdown-menu, pagination, alert-dialog, radio-group, skeleton, sonner, card, button, input, textarea, label, badge).
   - 백엔드 API 계약 확인: `/api/materials` (GET list / POST / GET [id] / PUT / DELETE), `/api/upload`, `/api/stats`, `/api/code-options`.
   - dev.log 확인 — 백엔드가 이미 동작 중이며 stats/materials/upload 엔드포인트가 200 응답.

2. 파일 생성 (전부 `src/` 하위, API 라우트/상수/db 미수정)
   - `src/hooks/use-role.ts` — zustand 전역 권한 스토어 (기본값 교역자).
   - `src/hooks/use-materials.ts` — React Query 훅: useMaterials, useMaterial, useStats, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, useUploadFile. queryKey 에 userRole 포함 → 권한 전환 시 자동 refetch. keepPreviousData 로 페이지네이션 깜빡임 방지.
   - `src/components/history/providers.tsx` — QueryClientProvider + TooltipProvider + Sonner Toaster.
   - `src/components/history/format.ts` — 날짜 포맷 헬퍼 (formatDate / formatDateTime / toDateInput / formatKorean, date-fns ko locale).
   - `src/components/history/classification-badge.tsx` — 자료분류 배지 (카테고리 색상 점 + 라벨: 문서=amber, 음영=emerald, 기물=rose).
   - `src/components/history/stat-card.tsx` — 대시보드 통계 카드 (amber/emerald/rose/stone 액센트).
   - `src/components/history/role-selector.tsx` — 헤더 권한 드롭다운 + 권한 라벨(관리 권한/비공개 조회 가능/공개 자료만 조회).
   - `src/components/history/file-upload.tsx` — SingleImageUpload (대표사진/QR) + AttachmentUpload (최대 10개 다중 첨부), /api/upload 연동, 진행/에러 토스트, 이미지 미리보기, 파일 크기 제한(이미지 20MB/첨부 50MB).
   - `src/components/history/dashboard.tsx` — 4개 통계 카드(전체/공개/비공개/이번 달) + recharts 3종 차트(분류별 막대, 성격별 파이, 월별 추이 라인) + 최근 등록 자료 테이블. 로딩 시 스켈레톤, 에러 시 재시도.
   - `src/components/history/material-list.tsx` — 검색/필터 바(검색어/소관부서/자료분류 grouped select/자료성격/공개여부/기준일자 from-to) + 결과 테이블(No·제목·부서·일자·공개·분류·성격·관리) + shadcn Pagination(처음/이전/번호/다음/마지막) + 행 클릭 상세 다이얼로그 + 교역자만 자료등록/수정/삭제 버튼 + 삭제 확인 AlertDialog.
   - `src/components/history/material-form.tsx` — 등록/수정 대형 Dialog. 필드: 자료제목(필수), 자료내용(textarea, HTML 허용 힌트), 소관부서(필수), 자료분류(grouped select, 필수), 자료성격(필수), 공개여부(radio), 기준일자(Calendar + Popover), 대표사진/QR(SingleImageUpload), 검색키워드, 첨부파일(AttachmentUpload 최대10). 검증(QR 제외 필수). 수정자/수정일자 자동 표기 영역. 저장(POST/PUT) + 삭제(DELETE, edit 모드) + 로딩/에러 토스트. React 권장 패턴(렌더 중 상태 조정 + key remount)으로 서버 데이터 동기화 — useEffect 내 setState lint 에러 회피.
   - `src/components/history/material-detail.tsx` — 상세 Dialog. 메타 정보(부서/일자/성격/공개/수정자/수정일자) + 본문(HTML이면 dangerouslySetInnerHTML, 아니면 pre-wrap) + 검색 키워드 태그 + 대표사진/QR 이미지 + 첨부파일 다운로드 링크 + 등록/수정 이력. 교역자만 수정/삭제 버튼.
   - `src/components/history/app-shell.tsx` — 전체 레이아웃: sticky 헤더(로고+타이틀+Rev1.1, 탭(대시보드/자료목록), 권한 셀렉터, 권한 표시 바) + 본문 + sticky 푸터(mt-auto, 시스템 정보/이관 안내). 상세/폼 다이얼로그 상태 관리.
   - `src/app/page.tsx` — `<Providers><AppShell/></Providers>` 만 렌더링.

3. 디자인 언어
   - warm archival 팔레트: bg-stone-50 루트, white 카드 + border-stone-200, amber-700/stone-800 액센트, 카테고리 색상(문서=amber/음영=emerald/기물=rose). indigo/blue 미사용.
   - min-h-screen flex flex-col + footer mt-auto 로 스티키 푸터 보장.
   - mobile-first 반응형(sm/md/lg/xl 브레이크포인트, 테이블 컬럼 숨김 처리, 그리드 자동 축소).
   - 로딩(skeleton) / 에러(재시도 버튼 + 토스트) / 빈 상태 메시지 처리.

4. 검증
   - `bun run lint` — 에러/경고 0건 통과.
   - dev.log — `GET / 200`, `GET /api/stats 200` 확인. 백엔드가 준비되어 실데이터로 대시보드/목록 렌더링됨.
   - 백엔드 미준비 시에도 로딩 스켈레톤 + 에러 재시도 UI로 크래시 없이 동작.

Stage Summary:
프론트엔드 SPA 완성. 단일 라우트 `/` 에 대시보드/자료목록/등록·수정/상세 4개 화면을 탭+다이얼로그 구조로 통합. React Query(zustand 권한 스토어) + shadcn/ui + recharts + sonner 조합. warm stone/amber 팔레트, sticky 헤더/푸터, 완전 반응형. 교역자/장로/안수집사권사/서리집사/등록교인/일반인 6단계 권한 전환 즉시 데이터 재조회. lint clean, dev server 정상 렌더링 확인.

---
Task ID: 5
Agent: main (orchestrator)
Task: Agent Browser end-to-end 검증 및 버그 수정

Work Log:
- 대시보드 렌더링 확인: 통계 카드 4종, 차트 3종(막대/파이/라인), 최근 자료 테이블 정상
- 자료 상세 다이얼로그 확인: 제목/내용/키워드/첨부파일/수정·삭제 버튼 정상
- 자료 목록 탭 전환 시 클라이언트 에러 발견 → 원인 분석: Radix SelectItem value="" 미허용
- material-list.tsx 버그 수정: "전체" 옵션 value "" → "all" 센티넬 사용, handleSearch에서 ""로 변환
- 검색 기능 검증: "예배" 검색 → 9건 필터 정상
- 권한 전환 검증: 교역자(50건/비공개 포함) ↔ 일반인(34건/공개만) 필터링 정상
- 자료 등록 플로우 검증: 폼 작성 → POST 201 → 목록 최상단 신규 자료 표시 확인
- 반응형 검증: 모바일(390px) 대시보드/목록 세로 정렬, 가로 스크롤 없음
- 푸터 검증: 문서 하단 고정(gapBelow=0), 긴 콘텐츠 시 자연 밀림

Stage Summary:
- 버그 1건 수정(SelectItem 빈 값) 후 모든 핵심 인터랙션 정상 동작
- lint 0 에러, dev 로그 런타임 에러 없음
- 대시보드/목록/상세/등록/권한전환/반응형/푸터 모두 검증 통과

---
Task ID: 6
Agent: main (orchestrator)
Task: 등록/수정/삭제 기능 진입점 강화 및 전체 플로우 검증

Work Log:
- dashboard.tsx: "자료 등록" 버튼 canManage 권한 체크 추가 (비관리자 숨김)
- dashboard.tsx: 최근 자료 표에 "관리" 컬럼 + DashboardRowActions(수정/삭제 버튼) 추가
- dashboard.tsx: useDeleteMaterial, ROLES, AlertDialog, toast, Pencil/Trash2 임포트 추가
- material-detail.tsx: 인쇄(Printer) 버튼 추가 (PPTX 요구사항 - 모든 사용자)
- material-detail.tsx: 인쇄 버튼은 모든 권한 표시, 수정/삭제는 canManage만 표시
- 브라우저 검증: 교역자 권한에서 등록 버튼·관리 액션 표시, 일반인 권한에서 숨김 확인
- 등록 플로우: "검증용 테스트 자료" 등록 → POST 201 → 대시보드 최상단 표시 확인
- 수정 플로우: 수정 버튼 클릭 → 폼 기존 데이터 로드 → 제목 "[수정됨]" 변경 → PUT 200 → 반영 확인
- 삭제 플로우: 삭제 버튼 → 확인 다이얼로그 → DELETE 200 → 목록에서 제거 확인
- 상세 다이얼로그: 인쇄/삭제/수정 버튼 모두 정상 표시 확인
- lint 0 에러, 모든 API 200 응답

Stage Summary:
- 등록/수정/삭제 전체 플로우 end-to-end 검증 완료
- 대시보드·목록·상세 3곳 모두에서 관리 액션 진입점 제공 (교역자 권한)
- 비관리자(일반인/등록교인/서리집사)는 등록/수정/삭제 버튼 숨김 처리
- 인쇄 기능 추가 (PPTX 요구사항 반영)

---
Task ID: 7
Agent: main (orchestrator)
Task: 업로드 실패 원인 분석 및 수정

Work Log:
- 원인 분석 1: 확장자 화이트리스트가 좁아 .txt/.csv/.zip/.hwp 등 차단 (400)
- 원인 분석 2: SingleImageUpload 클라이언트 제한 20MB vs API 50MB 불일치
- 원인 분석 3: Next.js 기본 본문 크기 제한(serverActions 1MB)로 대용량 실패 가능
- 원인 분석 4: 에러 메시지가 추상적이라 사용자가 원인 파악 어려움
- constants.ts: 허용 확장자 보강 (txt, hwp, rtf, csv, webp, svg, bmp, tiff, mov, avi, mkv, m4a, ogg, flac, zip, json 추가)
- constants.ts: BLOCKED_FILE_EXTENSIONS 추가 (exe, bat, cmd, sh, js, jar, msi, dll, so)
- constants.ts: getFileKind() 헬퍼 추가 (image/video/audio/document/archive/other 분류)
- next.config.ts: experimental.serverActions.bodySizeLimit = "50mb" 설정
- upload/route.ts: Content-Length 사전 검사, 차단 확장자 검사, 저장 검증, 상세 에러 메시지
- use-materials.ts: useUploadFile 에러 처리 개선 (상태코드별 한국어 prefix, detail 추출)
- file-upload.tsx: validateFile() 클라이언트 사전 검증, 파일 종류별 아이콘, 50MB 통일
- 검증: txt/pdf/png/exe/5MB/60MB/브라우저fetch 모든 시나리오 의도대로 동작
- lint 0 에러, dev 로그 201/400/413 정상 응답

Stage Summary:
- 업로드 실패 4가지 원인 모두 수정
- 허용 확장자 14개 → 31개로 확대 (HWP 포함)
- 보안 차단 확장자 명시 (실행 파일)
- 클라이언트/서버 양쪽 검증으로 빠른 피드백 + 안전
- 에러 메시지 한국어화로 사용자 친화적
- 50MB까지 업로드 가능 (Next.js 제한 상향)

---
Task ID: 8
Agent: main (orchestrator)
Task: QR 코드 자동 생성 기능 추가

Work Log:
- qrcode + @types/qrcode 패키지 설치
- POST /api/qr-generate API 구현: 텍스트 입력 → 서버에서 PNG 생성 → /uploads 저장 → URL 반환
  - errorCorrectionLevel 'M' (15% 복구율), margin 2, warm black(#1c1917)/흰 배경
  - 크기 128~1024px (기본 320), 텍스트 최대 2048자 검증
  - 저장 검증 (stat.size 비교)
- use-materials.ts: useGenerateQr hook 추가 (QrGenerateResult 타입, 에러 처리)
- qr-generator.tsx 신규 컴포넌트: QR 자동 생성 버튼 + 다이얼로그
  - 텍스트 입력 필드, 생성 버튼, 로딩 스피너
  - 생성 후 미리보기 + "자동 생성됨" 라벨 + 제거 버튼
  - defaultText로 자료 제목 자동 제안
- material-form.tsx: QR 필드를 SingleImageUpload → QrGenerator로 교체
  - defaultText: `[분류] 제목` 형태로 자료 식별 정보 자동 완성
  - hint "기물 자료용 — 자동 생성 또는 이미지 업로드"
- 브라우저 검증: QR 자동 생성 버튼 → 다이얼로그 → 텍스트 입력 → 생성 → 미리보기(320x320 PNG) → 폼 저장 → 상세 다이얼로그에 QR 표시
- POST /api/qr-generate 201, POST /api/materials 201 정상 응답
- lint 0 에러

Stage Summary:
- QR 코드를 파일 업로드 없이 서버에서 자동 생성 가능
- 기물 자료(0301~0304) 식별용 QR 코드 자동 발행
- 자료 제목 기반 defaultText로 빠른 생성 지원
- 생성된 QR은 일반 이미지처럼 저장/표시/제거 가능

---
Task ID: 9
Agent: main (orchestrator)
Task: Next.js 개발 모드 "1 issue" 배너 원인 분석 및 해결

Work Log:
- 원인 분석: 2가지 문제 발견
  1. Hydration mismatch: dashboard.tsx의 format(new Date(), "yyyy-MM") / format(new Date(), "yyyy년 M월")이 서버(UTC)와 클라이언트(Asia/Seoul) 시간대 차이로 불일치
  2. 접근성 경고: material-detail.tsx DialogContent에 Description 없어 aria-describedby 경고
- use-role.ts: useMounted() 훅 추가 (useSyncExternalStore 기반, hydration-safe)
  - 서버 스냅샷: false, 클라이언트 스냅샷: true
  - React 19 set-state-in-effect 규칙 준수
- dashboard.tsx: monthCount, monthLabel을 mounted 후에만 계산
  - hint={monthLabel || "이번 달"} 로 마운트 전 placeholder
- material-detail.tsx: DialogContent에 aria-describedby={undefined} 명시 (접근성 경고 해결)
- 검증: 새로고침 후 콘솔 에러/경고 0건, hydration 에러 0건, Fast Refresh full reload 0건
- VLM 확인: 화면에 이슈 배너/에러 표시 없음 ("이슈 없음")
- lint 0 에러

Stage Summary:
- "1 issue" 배너(개발 모드) 완전 제거
- Hydration mismatch 해결: 날짜 렌더링을 클라이언트 마운트 후로 지연
- 접근성 경고 해결: DialogContent aria-describedby 명시
- Fast Refresh unrecoverable error 경고도 사라짐

---
Task ID: 10
Agent: main (orchestrator)
Task: 닫기 버튼 간격 및 모바일 페이지네이션 넘어감 문제 수정

Work Log:
- 사용자 스크린샷 2장 VLM 분석으로 문제 진단
- 문제 1: 상세/등록 다이얼로그 닫기(X) 버튼이 헤더 요소(배지, 제목)와 너무 붙어있음
  - 원인: Radix Dialog 닫기 버튼이 absolute 포지션으로 헤더 요소와 겹침
- 문제 2: 모바일에서 자료목록 페이지네이션이 화면 영역 넘어감
  - 원인: 10개 버튼(처음/이전/6번호/다음/마지막) × 32px + gap = 360px, 390px 화면에서 넘어감

수정 내용:
- material-detail.tsx: 헤더를 2행 구조로 변경 (제목 행 / 배지 행 분리), pr-14로 닫기 버튼 공간 확보
- material-form.tsx: 헤더에 pr-14, aria-describedby={undefined} 추가, min-w-0/shrink-0로 반응형 개선
- qr-generator.tsx: DialogContent에 aria-describedby={undefined} 추가
- globals.css: 닫기 버튼 위치 CSS 추가 (top/right 0.75rem, 모바일 0.625rem, z-50)
- globals.css: 커스텀 스크롤바(.scrollbar-thin) 유틸리티 추가
- material-list.tsx: 페이지네이션 반응형 개선
  - 모바일: 버튼 size-7(28px), gap-0.5, 아이콘 size-3.5, 텍스트 text-xs
  - 데스크톱: 버튼 size-8(32px), gap-1, 아이콘 size-4, 텍스트 text-sm
  - PaginationContent에 flex-wrap + justify-center로 줄바꿈 허용
  - px-3(모바일)/px-4(데스크톱)로 패딩 최적화

검증:
- 모바일 390px: 페이지네이션 모두 화면 안, 닫기 버튼 적절한 간격 (VLM 확인)
- 모바일 320px: 페이지네이션 정상 표시 (VLM 확인)
- 데스크톱 1440px: 상세 다이얼로그 헤더 정상 (VLM 확인)
- 콘솔 에러/경고 0건, lint 0 에러

Stage Summary:
- 닫기 버튼이 헤더 요소와 분리되어 적절한 간격 확보
- 모바일 페이지네이션이 320px 좁은 화면에서도 넘어가지 않음
- 줄바꿈 허용으로 페이지 많아져도 대응

---
Task ID: 11
Agent: main (orchestrator)
Task: 시놀로지 NAS Docker 배포 환경 구성

Work Log:
- next.config.ts 이미 standalone 모드 확인 (Docker 배포 최적화)
- bun run build로 standalone 산출물 생성 검증 (server.js, 159MB, HTTP 200)
- Dockerfile 작성 (3단계 다중 스테이지):
  - Stage 1 (deps): oven/bun:1.1, 의존성 설치
  - Stage 2 (builder): prisma generate + next build
  - Stage 3 (runtime): node:20-alpine, standalone 서버 + prisma CLI
  - non-root 사용자(nextjs, UID 1001) 보안 적용
  - HEALTHCHECK 추가 (wget spider, 30s 간격)
  - DATABASE_URL=file:/app/db/custom.db 기본값
- .dockerignore 작성: node_modules, .next, .git, 로그, 업로드 등 제외
- docker-entrypoint.sh 작성: 컨테이너 시작 시 prisma db push 자동 실행 후 서버 구동
- docker-compose.yml 작성:
  - 포트 3100:3000 (시놀로지 3000 충돌 회피)
  - 볼륨 2개: db-data (/app/db), uploads-data (/app/public/uploads) 영속화
  - restart: unless-stopped
  - 리소스 제한: 512MB 메모리, 1 CPU
  - 헬스체크 설정
- DEPLOY.md 배포 가이드 작성:
  - 방법 A: Container Manager 프로젝트 기능 (GUI 권장)
  - 방법 B: SSH 명령어 (고급)
  - 데이터 영속화, 외부 접속(역방향 프록시), 백업/복구, 문제해결, 보안 체크리스트
- package.json: prisma seed 설정 추가, db:seed 스크립트 추가

검증:
- bun run build 정상 (standalone 산출물 확인)
- standalone 서버 동작 확인 (HTTP 200)
- lint 0 에러

Stage Summary:
- 시놀로지 NAS Container Manager 배포용 Docker 환경 완성
- 3단계 멀티스테이지로 이미지 크기 최소화
- DB/업로드 파일 볼륨 영속화로 컨테이너 재생성 시 데이터 유지
- 컨테이너 시작 시 자동 DB 스키마 적용
- HTTPS 역방향 프록시 가이드 포함

---
Task ID: 12
Agent: main (orchestrator)
Task: "1 이슈" 배너 재발 확인 및 해결

Work Log:
- Next.js 개발자 도구 포털(nextjs-portal)의 shadow DOM에서 nextjs-toast 배지 발견
- data-error="false", label 비어있음 — 실제 에러 아닌 Next.js 16 개발자 도구 배지
- 좌측 하단 "N" 배지가 이전 코드 변경 HMR 과정에서 잔류한 것으로 판단
- .next/cache 디렉토리 정리
- 페이지 재로드 후 배지 완전히 사라짐 (VLM 확인 "이슈 없음")

전체 화면별 이슈 점검 (모두 정상):
- 데스크톱 대시보드: 이슈 없음
- 데스크톱 자료 목록: 이슈 없음
- 데스크톱 상세 다이얼로그: 이슈 없음
- 데스크톱 등록 폼: 이슈 없음
- 모바일(390px) 대시보드: 이슈 없음
- 모바일 자료 목록 + 검색: 이슈 없음

최종 검증:
- 콘솔 에러/경고 0건
- 페이지 에러 0건
- lint 0 에러
- dev 서버 로그 에러 0건

Stage Summary:
- Next.js 16 개발자 도구 배지가 캐시 정리 후 사라짐
- 모든 화면/반응형에서 이슈 0건 확인
- 프로덕션 빌드(Docker)에서는 개발 도구 배지 자체가 표시되지 않음
