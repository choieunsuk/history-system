"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ROLES, type RoleValue } from "@/lib/constants";
import { useRoleStore } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { ChevronDown, UserRound, Check } from "lucide-react";

export function getRolePermissionLabel(role: RoleValue): {
  text: string;
  className: string;
} {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return { text: "", className: "" };
  if (r.canManage)
    return {
      text: "관리 권한",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  if (r.canViewPrivate)
    return {
      text: "비공개 조회 가능",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  return {
    text: "공개 자료만 조회",
    className: "border-stone-200 bg-stone-100 text-stone-600",
  };
}

export function RoleSelector() {
  const role = useRoleStore((s) => s.role);
  const setRole = useRoleStore((s) => s.setRole);
  const roleInfo = ROLES.find((r) => r.value === role) ?? ROLES[0];
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-800"
          >
            <UserRound className="size-4 text-amber-700" />
            <span className="text-sm font-medium">{roleInfo.label}</span>
            <ChevronDown className="size-3.5 text-stone-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 border-stone-200 bg-white"
        >
          <DropdownMenuLabel className="text-stone-500">
            권한 전환 (데모)
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((r) => (
            <DropdownMenuItem
              key={r.value}
              onClick={() => setRole(r.value)}
              className="gap-2"
            >
              <span className="flex-1">{r.label}</span>
              {r.canManage ? (
                <span className="text-[10px] text-amber-700">관리</span>
              ) : r.canViewPrivate ? (
                <span className="text-[10px] text-emerald-700">비공개</span>
              ) : (
                <span className="text-[10px] text-stone-400">공개</span>
              )}
              {r.value === role ? (
                <Check className="size-3.5 text-stone-800" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
