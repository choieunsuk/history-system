"use client";

import { ROLES, type RoleValue } from "@/lib/constants";
import { useRoleStore } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";

export function getRolePermissionLabel(role: RoleValue): {
  text: string;
  className: string;
} {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return { text: "", className: "" };
  if (r.canAdmin)
    return {
      text: "모든 권한",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  if (r.canManage)
    return {
      text: "자료 관리 가능",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  return {
    text: "공개 자료만 조회",
    className: "border-stone-200 bg-stone-100 text-stone-600",
  };
}

/**
 * 현재 로그인 사용자의 권한을 표시하는 읽기 전용 배지.
 * 권한은 로그인 세션이 결정하며 여기서 변경할 수 없다. (RoleSync 가 세션→store 동기화)
 */
export function RoleSelector() {
  const role = useRoleStore((s) => s.role);
  const roleInfo =
    ROLES.find((r) => r.value === role) ?? ROLES[ROLES.length - 1];
  const perm = getRolePermissionLabel(role);

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "hidden rounded-md border px-2 py-1 text-[11px] font-medium sm:inline-block",
          perm.className
        )}
      >
        {perm.text}
      </span>
      <div className="flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-stone-700">
        <UserRound className="size-4 text-amber-700" />
        <span className="text-sm font-medium">{roleInfo.label}</span>
      </div>
    </div>
  );
}
