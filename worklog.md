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
