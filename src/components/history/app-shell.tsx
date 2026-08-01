"use client";

import { useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpen,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { useRoleStore } from "@/hooks/use-role";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleSelector, getRolePermissionLabel } from "./role-selector";
import { UserMenu } from "@/components/auth/user-menu";
import { RoleSync } from "@/components/auth/role-sync";
import { Dashboard } from "./dashboard";
import { MaterialList } from "./material-list";
import { MaterialForm } from "./material-form";
import { MaterialDetail } from "./material-detail";

type Tab = "dashboard" | "list";

export function AppShell() {
  const role = useRoleStore((s) => s.role);
  const roleInfo = ROLES.find((r) => r.value === role) ?? ROLES[0];

  const [tab, setTab] = useState<Tab>("dashboard");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openDetail = (id: string) => setDetailId(id);
  const closeDetail = () => setDetailId(null);

  const openEdit = (id: string | null) => {
    setEditId(id);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
  };

  const handleEditFromDetail = (id: string) => {
    closeDetail();
    openEdit(id);
  };

  const perm = getRolePermissionLabel(role);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* 로그인 세션 role → 전역 권한 store 동기화 */}
      <RoleSync />

      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-3.5">
          {/* 로고 + 타이틀 */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-700 to-stone-800 text-white shadow-sm">
              <Archive className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-stone-800 sm:text-lg">
                역사자료부 자료이관 시스템
              </h1>
              <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <span className="hidden sm:inline">Korean Church History Archives</span>
                <span className="hidden text-stone-300 sm:inline">·</span>
                <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-600">
                  Rev 1.1
                </span>
              </p>
            </div>
          </div>

          {/* 권한 + 탭 */}
          <div className="flex items-center gap-3">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as Tab)}
              className="w-full lg:w-auto"
            >
              <TabsList className="h-9 bg-stone-100 p-1">
                <TabsTrigger value="dashboard" className="gap-1.5 px-3">
                  <BarChart3 className="size-3.5" />
                  <span className="text-sm">대시보드</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5 px-3">
                  <BookOpen className="size-3.5" />
                  <span className="text-sm">자료 목록</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <RoleSelector />
            <UserMenu />
          </div>
        </div>

        {/* 권한 표시 바 */}
        <div className="border-t border-stone-100 bg-stone-50/80">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[11px] text-stone-500 sm:px-6">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3 text-amber-600" />
              현재 권한:
              <span className="font-semibold text-stone-700">{roleInfo.label}</span>
            </span>
            <span className="text-stone-300">|</span>
            <span className={cn("rounded px-1.5 py-0.5 font-medium", perm.className)}>
              {perm.text}
            </span>
            <span className="hidden text-stone-300 sm:inline">|</span>
            <span className="hidden sm:inline">
              자료 {roleInfo.canManage ? "등록·수정·삭제" : "조회"} 가능
            </span>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {tab === "dashboard" ? (
          <Dashboard onOpenDetail={openDetail} onOpenEdit={openEdit} />
        ) : (
          <MaterialList onOpenDetail={openDetail} onOpenEdit={openEdit} />
        )}
      </main>

      {/* 푸터 */}
      <footer className="mt-auto border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-stone-700">
              역사자료부 자료이관 시스템
            </span>
            <span className="text-stone-300">·</span>
            <span>Rev 1.1</span>
            <span className="text-stone-300">·</span>
            <span>MS-SQL + ASP.NET → Next.js 16 이관</span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-400">
            <span>© History Archives</span>
            <ChevronRight className="size-3" />
            <span>Prisma · SQLite · React Query · shadcn/ui</span>
          </div>
        </div>
      </footer>

      {/* 다이얼로그 */}
      <MaterialDetail
        id={detailId}
        onClose={closeDetail}
        onEdit={handleEditFromDetail}
      />
      <MaterialForm open={formOpen} id={editId} onClose={closeForm} />
    </div>
  );
}
