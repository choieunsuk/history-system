# Task 3-b — Frontend SPA (역사자료부 자료이관 시스템)

**Agent:** full-stack-developer (frontend)
**Task:** Build the single-page frontend at `src/app/page.tsx` against the backend API contract.
**Status:** ✅ Complete — lint clean, page renders 200 against live backend.

## Files Created

### Hooks (`src/hooks/`)
- `use-role.ts` — zustand store `{ role, setRole }`, default `교역자`.
- `use-materials.ts` — React Query hooks: `useMaterials` (keepPreviousData), `useMaterial`, `useStats`, `useCreateMaterial`, `useUpdateMaterial`, `useDeleteMaterial`, `useUploadFile`. `userRole` baked into query keys → role switch auto-refetch.

### Components (`src/components/history/`)
- `providers.tsx` — QueryClientProvider + TooltipProvider + Sonner Toaster.
- `app-shell.tsx` — root layout: sticky header (logo + title + Rev1.1 + tabs + role selector + permission bar), main, sticky footer (`mt-auto`). Owns detail/form dialog state.
- `dashboard.tsx` — 4 stat cards + 3 recharts (bar by category / pie by character / line by month) + recent materials table. Skeleton + error retry.
- `stat-card.tsx` — reusable stat card with amber/emerald/rose/stone accents.
- `material-list.tsx` — search/filter bar (q, department, classification grouped, character, public, date from/to) + results table + shadcn pagination (first/prev/numbers/next/last) + row actions (edit/delete AlertDialog) for managers.
- `material-form.tsx` — large Dialog. All fields (title, content, department, classification, character, isPublic radio, referenceDate Calendar+Popover, representativeImg, qrImage, searchKeywords, attachments). Validation (QR optional). Create/Update/Delete via mutations. React render-time state adjustment pattern (no setState-in-effect lint error).
- `material-detail.tsx` — Dialog. Meta grid + HTML content (dangerouslySetInnerHTML with Tailwind child selectors) + keyword tags + images + attachment download links + audit trail. Edit/Delete for managers.
- `file-upload.tsx` — `SingleImageUpload` (preview + remove) + `AttachmentUpload` (multi, max 10, list with name/size/remove). Uses `/api/upload`, toasts, size limits.
- `role-selector.tsx` — header dropdown switching 6 roles + permission badge.
- `classification-badge.tsx` — category dot + label badge (문서=amber, 음영=emerald, 기물=rose).
- `format.ts` — date helpers (date-fns + ko locale).

### Route
- `src/app/page.tsx` — `<Providers><AppShell /></Providers>`.

## UI Structure
```
Providers (QueryClient + Tooltip + Sonner)
└─ AppShell (min-h-screen flex flex-col bg-stone-50)
   ├─ header (sticky) — logo/title/Rev1.1 · Tabs(대시보드|자료목록) · RoleSelector · permission bar
   ├─ main (flex-1, max-w-7xl)
   │   ├─ Dashboard tab → stat cards · 3 charts · recent table
   │   └─ List tab → filter bar · results table · pagination
   ├─ footer (mt-auto) — system info / MS-SQL→Next.js migration note
   ├─ MaterialDetail dialog (on row/recent click)
   └─ MaterialForm dialog (register/edit, keyed by id)
```

## Design
- Warm archival palette: `bg-stone-50` root, white cards `border-stone-200`, amber-700/stone-800 accents. No indigo/blue.
- Mobile-first responsive (sm/md/lg/xl), table columns hide on small screens.
- Sticky footer via `min-h-screen flex flex-col` + `footer mt-auto`.
- Loading skeletons, error retry UIs, empty states, sonner toasts throughout.
- Role switch (교역자 default) instantly re-queries; permission badge shows 관리 권한 / 비공개 조회 가능 / 공개 자료만 조회.

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `GET /` → 200, `GET /api/stats` → 200 (backend live with seeded data).
- Backend not-yet-ready paths degrade gracefully (skeletons + retry) without crashing.

## Constraints Honored
- Only modified `src/app/page.tsx` + new files under `src/components/history/`, `src/hooks/`.
- Did NOT touch `src/app/api/*`, `src/lib/constants.ts`, `src/lib/db.ts`, `src/app/layout.tsx`, `src/app/globals.css`.
- Used existing shadcn/ui primitives exclusively; no new primitive components.
- All API calls use relative paths (same-origin port 3000).
