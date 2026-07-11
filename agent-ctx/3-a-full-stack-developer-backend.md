# Task 3-a — Backend Agent Work Record

## Task ID: 3-a
## Agent: full-stack-developer (backend)
## Task: 역사자료부 자료이관 시스템 — 백엔드 API 8종 구현 (Route Handlers + Prisma/SQLite)

## Files Created
1. `src/lib/api-helpers.ts` — 공용 헬퍼 (serializeMaterial, canViewPrivate, buildRoleVisibilityWhere, parseDateOnly, endOfDay)
2. `src/app/api/materials/route.ts` — GET 목록/검색 + POST 생성
3. `src/app/api/materials/[id]/route.ts` — GET / PUT / DELETE (단일 자료)
4. `src/app/api/upload/route.ts` — POST 파일 업로드 (multipart/form-data)
5. `src/app/api/stats/route.ts` — GET 대시보드 통계
6. `src/app/api/code-options/route.ts` — GET 코드 옵션 (분류/성격/공개/권한)

## Design Decisions
- 모든 라우트에 `export const dynamic = "force-dynamic"` + `runtime = "nodejs"` 명시 (캐싱 방지 + fs/crypto 사용)
- Next.js 16 규칙 준수: `[id]` 라우트의 `params`는 Promise로 await 처리
- 권한 필터링은 `buildRoleVisibilityWhere()` 헬퍼로 일원화
  - PRIVATE_VIEW_ROLES(교역자/장로/안수집사권사) 외에는 항상 `isPublic: true` 강제
  - PRIVATE_VIEW_ROLES에 속하면 isPublic 파라미터 존중 (미지정시 전체)
- Prisma `mode: "insensitive"` 미사용 (SQLite 미지원) → 일반 `contains` 사용
- 날짜 필터: dateTo는 endOfDay()로 23:59:59.999 설정 (포함 범위)
- 통계 byMonth: 현재 월 기준 과거 12개월, 데이터 없는 월도 0으로 채움
- 업로드: `crypto.randomUUID()` + 원래 확장자, 50MB 제한, 확장자 화이트리스트 검증, formData() 실패 시 400 응답
- Attachment 삭제는 Prisma `onDelete: Cascade`에 의존 (명시적 deleteMany 불필요)

## Verification
- `bun run lint` → 통과 (에러 0건)
- 8개 엔드포인트 모두 curl 테스트 완료:
  - GET /api/code-options → 분류 9종/성격 4종/공개 2종/권한 6종 반환
  - GET /api/stats?userRole=일반인 → total=34, privateCount=0 (비공개 가림)
  - GET /api/stats?userRole=교역자 → total=50, publicCount=34, privateCount=16
  - GET /api/materials → 목록/검색/분류/부서/날짜/공개여부 필터 모두 정상
  - POST /api/materials → 201 반환, modifier="시스템"
  - GET /api/materials/[id] → 비공개 + 일반인 = 403, 존재하지 않음 = 404
  - PUT /api/materials/[id] → modifier="시스템", modifiedDate 자동 갱신 (@updatedAt)
  - DELETE /api/materials/[id] → { success: true } + cascade 삭제
  - POST /api/upload → 정상 파일 201, 잘못된 확장자 400, 본문 없음 400
- dev.log에 500 에러/경고 없음 확인

## Stage Summary
백엔드 8개 API 라우트와 1개 공용 헬퍼 모듈 구현 완료. 권한 기반 가시성 필터링, 페이지네이션, 검색, 날짜 범위 필터, 통계 집계, 파일 업로드 모두 정상 동작 확인. 프런트엔드 에이전트가 즉시 호출 가능한 상태.
