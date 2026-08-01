"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { KeyRound, LogOut, Users } from "lucide-react";
import { normalizeRole, ADMIN_ROLES } from "@/lib/constants";
import { ChangePasswordDialog } from "./change-password-dialog";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [pwOpen, setPwOpen] = useState(false);

  if (status === "loading") {
    return <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />;
  }

  if (!session?.user) {
    return null;
  }

  const role = normalizeRole(session.user.role);
  const isAdmin = ADMIN_ROLES.includes(role as never);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {session.user.name?.charAt(0).toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
              <p className="text-xs text-gray-500">권한: {role}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setPwOpen(true)}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            비밀번호 변경
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                사용자 관리
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left"
            >
              로그아웃
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </>
  );
}
