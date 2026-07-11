"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { useRoleStore } from "@/hooks/use-role";
import { useDeleteMaterial, useMaterials } from "@/hooks/use-materials";
import {
  CLASSIFICATIONS,
  MATERIAL_CHARACTERS,
  ROLES,
  type ClassificationCategory,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClassificationBadge } from "./classification-badge";
import { PublicBadge } from "./dashboard";
import { formatDate } from "./format";

const PAGE_SIZE = 10;

const CATEGORY_GROUPS: {
  category: ClassificationCategory;
  items: typeof CLASSIFICATIONS;
}[] = (["문서", "음영", "기물"] as ClassificationCategory[]).map((c) => ({
  category: c,
  items: CLASSIFICATIONS.filter((x) => x.category === c),
}));

export function MaterialList({
  onOpenDetail,
  onOpenEdit,
}: {
  onOpenDetail: (id: string) => void;
  onOpenEdit: (id: string | null) => void;
}) {
  const role = useRoleStore((s) => s.role);
  const roleInfo = ROLES.find((r) => r.value === role);
  const canManage = !!roleInfo?.canManage;

  const delMut = useDeleteMaterial();

  // 폼 상태 (검색/필터)
  const [q, setQ] = useState("");
  const [classification, setClassification] = useState<string>("");
  const [materialCharacter, setMaterialCharacter] = useState<string>("");
  const [isPublic, setIsPublic] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // 실제 조회에 사용되는 파라미터 (검색 버튼을 눌렀을 때만 갱신)
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ ...applied, page, pageSize: PAGE_SIZE, userRole: role }),
    [applied, page, role]
  );

  const { data, isLoading, isError, refetch, isFetching } = useMaterials(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const handleSearch = () => {
    setApplied({
      q: q.trim(),
      classification: classification === "all" ? "" : classification,
      materialCharacter: materialCharacter === "all" ? "" : materialCharacter,
      isPublic: isPublic === "all" ? "" : isPublic,
      department: department.trim(),
      dateFrom,
      dateTo,
    });
    setPage(1);
  };

  const handleReset = () => {
    setQ("");
    setClassification("");
    setMaterialCharacter("");
    setIsPublic("");
    setDepartment("");
    setDateFrom("");
    setDateTo("");
    setApplied({});
    setPage(1);
  };

  const hasFilter = !!(
    applied.q ||
    applied.classification ||
    applied.materialCharacter ||
    applied.isPublic ||
    applied.department ||
    applied.dateFrom ||
    applied.dateTo
  );

  const confirmDelete = (id: string) => {
    delMut.mutate(id, {
      onSuccess: () => toast.success("자료가 삭제되었습니다."),
      onError: (e) => toast.error(e.message || "삭제 실패"),
    });
  };

  return (
    <div className="space-y-4">
      {/* 검색 / 필터 */}
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="검색어">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="자료제목 / 키워드"
              className="bg-white"
            />
          </Field>
          <Field label="소관부서">
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="예: 역사자료부"
              className="bg-white"
            />
          </Field>
          <Field label="자료분류">
            <Select value={classification} onValueChange={setClassification}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="전체 분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                {CATEGORY_GROUPS.map((g) => (
                  <SelectGroup key={g.category}>
                    <SelectLabel>{g.category}</SelectLabel>
                    {g.items.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="자료성격">
            <Select value={materialCharacter} onValueChange={setMaterialCharacter}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="전체 성격" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 성격</SelectItem>
                {MATERIAL_CHARACTERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="공개여부">
            <Select value={isPublic} onValueChange={setIsPublic}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="true">공개</SelectItem>
                <SelectItem value="false">비공개</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="기준일자">
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white"
              />
              <span className="text-stone-400">~</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white"
              />
            </div>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="text-xs text-stone-500">
            {hasFilter ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                필터 적용됨
              </span>
            ) : (
              <span>전체 자료 조회 중</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
            >
              <RotateCcw className="size-3.5" />
              초기화
            </Button>
            <Button
              size="sm"
              onClick={handleSearch}
              className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800"
            >
              <Search className="size-3.5" />
              검색
            </Button>
            {canManage ? (
              <Button
                size="sm"
                onClick={() => onOpenEdit(null)}
                className="gap-1.5 bg-stone-800 text-white hover:bg-stone-900"
              >
                <Plus className="size-3.5" />
                자료 등록
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-stone-800">자료 목록</span>
            <span className="text-stone-400">|</span>
            <span className="text-stone-500">
              전체 <span className="font-semibold text-amber-700">{total}</span>건
            </span>
            {isFetching ? (
              <span className="ml-1 text-xs text-stone-400">불러오는 중…</span>
            ) : null}
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-stone-500">
              자료를 불러오지 못했습니다. 백엔드가 아직 준비 중일 수 있습니다.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 bg-stone-50/60 hover:bg-stone-50/60">
                <TableHead className="w-12 pl-4 text-center text-stone-500">No</TableHead>
                <TableHead className="text-stone-500">자료제목</TableHead>
                <TableHead className="hidden text-stone-500 lg:table-cell">소관부서</TableHead>
                <TableHead className="hidden text-stone-500 md:table-cell">기준일자</TableHead>
                <TableHead className="text-stone-500">공개</TableHead>
                <TableHead className="text-stone-500">자료분류</TableHead>
                <TableHead className="hidden text-stone-500 xl:table-cell">자료성격</TableHead>
                {canManage ? (
                  <TableHead className="w-20 pr-4 text-right text-stone-500">관리</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-stone-100">
                    <TableCell colSpan={canManage ? 8 : 7} className="py-2">
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow className="border-stone-100">
                  <TableCell
                    colSpan={canManage ? 8 : 7}
                    className="py-16 text-center text-sm text-stone-400"
                  >
                    {hasFilter
                      ? "검색 조건에 해당하는 자료가 없습니다."
                      : "등록된 자료가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((m, idx) => (
                  <TableRow
                    key={m.id}
                    onClick={() => onOpenDetail(m.id)}
                    className="cursor-pointer border-stone-100 hover:bg-amber-50/30"
                  >
                    <TableCell className="pl-4 text-center text-stone-400 tabular-nums">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <span className="line-clamp-1 font-medium text-stone-800">
                        {m.title}
                      </span>
                      <div className="mt-0.5 line-clamp-1 text-xs text-stone-400 lg:hidden">
                        {m.department} · {formatDate(m.referenceDate)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-stone-600 lg:table-cell">
                      {m.department}
                    </TableCell>
                    <TableCell className="hidden text-stone-600 md:table-cell">
                      {formatDate(m.referenceDate)}
                    </TableCell>
                    <TableCell>
                      <PublicBadge isPublic={m.isPublic} />
                    </TableCell>
                    <TableCell>
                      <ClassificationBadge code={m.classification} />
                    </TableCell>
                    <TableCell className="hidden text-stone-600 xl:table-cell">
                      {m.materialCharacter}
                    </TableCell>
                    {canManage ? (
                      <TableCell
                        className="pr-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActions
                          id={m.id}
                          title={m.title}
                          onEdit={() => onOpenEdit(m.id)}
                          onDelete={() => confirmDelete(m.id)}
                          deleting={delMut.isPending && delMut.variables === m.id}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* 페이지네이션 */}
        {!isError && totalPages > 0 ? (
          <div className="flex flex-col items-center gap-2 border-t border-stone-100 px-4 py-3 sm:flex-row sm:justify-between">
            <span className="text-xs text-stone-400">
              {page} / {totalPages} 페이지
            </span>
            <Pagination className="mx-0 w-auto justify-center sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setPage(1)}
                    aria-disabled={page === 1}
                    className={cn(
                      "size-8 gap-0 px-0",
                      page === 1 && "pointer-events-none opacity-40"
                    )}
                  >
                    <ChevronsLeft className="size-4" />
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-disabled={page === 1}
                    className={cn(
                      "size-8 gap-0 px-0",
                      page === 1 && "pointer-events-none opacity-40"
                    )}
                  >
                    <ChevronLeft className="size-4" />
                  </PaginationLink>
                </PaginationItem>
                {pageRange(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <PaginationItem key={`e${i}`}>
                      <span className="flex size-8 items-center justify-center text-stone-400">
                        …
                      </span>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                        className="size-8 px-0"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-disabled={page === totalPages}
                    className={cn(
                      "size-8 gap-0 px-0",
                      page === totalPages && "pointer-events-none opacity-40"
                    )}
                  >
                    <ChevronRight className="size-4" />
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setPage(totalPages)}
                    aria-disabled={page === totalPages}
                    className={cn(
                      "size-8 gap-0 px-0",
                      page === totalPages && "pointer-events-none opacity-40"
                    )}
                  >
                    <ChevronsRight className="size-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-stone-600">{label}</label>
      {children}
    </div>
  );
}

function RowActions({
  id: _id,
  title,
  onEdit,
  onDelete,
  deleting,
}: {
  id: string;
  title: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-stone-500 hover:bg-stone-100 hover:text-amber-700"
        onClick={onEdit}
        title="수정"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-stone-500 hover:bg-rose-50 hover:text-rose-600"
        onClick={() => setOpen(true)}
        title="삭제"
        disabled={deleting}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              자료 「{title}」를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {deleting ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
