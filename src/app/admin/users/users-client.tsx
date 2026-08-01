"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLES, type RoleValue } from "@/lib/constants";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: RoleValue;
  image: string | null;
  createdAt: string;
  isSelf: boolean;
}

const ROLE_BADGE: Record<RoleValue, string> = {
  관리자: "border-amber-200 bg-amber-50 text-amber-800",
  운영자: "border-emerald-200 bg-emerald-50 text-emerald-800",
  일반: "border-stone-200 bg-stone-100 text-stone-600",
};

export function UsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // 비밀번호 초기화 다이얼로그
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "목록을 불러오지 못했습니다.");
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (user: AdminUser, role: RoleValue) => {
    if (role === user.role) return;
    setSavingId(user.id);
    // 낙관적 업데이트
    const prev = users;
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, role } : u)));
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "권한 변경에 실패했습니다.");
      }
      toast.success(`${user.name || user.email} → ${role} 로 변경되었습니다.`);
    } catch (e) {
      setUsers(prev); // 롤백
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPw.length < 6) {
      toast.error("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "비밀번호 초기화에 실패했습니다.");
      toast.success(
        `${resetUser.name || resetUser.email} 의 비밀번호가 초기화되었습니다.`
      );
      setResetUser(null);
      setNewPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-700 to-stone-800 text-white">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-800">사용자 관리</h1>
              <p className="text-xs text-stone-500">
                가입한 사용자의 권한(관리자·운영자·일반)을 설정합니다.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1.5 size-4" />
              돌아가기
            </Link>
          </Button>
        </div>

        {/* 권한 안내 */}
        <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-stone-500">
          {ROLES.map((r) => (
            <span
              key={r.value}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1"
            >
              <ShieldCheck className="size-3 text-amber-600" />
              <b className="text-stone-700">{r.label}</b> · {r.description}
            </span>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              전체 사용자 {loading ? "" : `(${users.length}명)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-stone-400">
                불러오는 중…
              </p>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">
                사용자가 없습니다.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름 / 이메일</TableHead>
                    <TableHead className="w-28">현재 권한</TableHead>
                    <TableHead className="w-44">권한 변경</TableHead>
                    <TableHead className="w-32">비밀번호</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-800">
                            {u.name || "(이름 없음)"}
                            {u.isSelf && (
                              <span className="ml-1.5 text-[10px] text-amber-700">
                                (나)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-stone-500">
                            {u.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ROLE_BADGE[u.role]}
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          disabled={u.isSelf || savingId === u.id}
                          onValueChange={(v) =>
                            changeRole(u, v as RoleValue)
                          }
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {u.isSelf && (
                          <p className="mt-1 text-[10px] text-stone-400">
                            본인 권한은 변경 불가
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setNewPw("");
                            setResetUser(u);
                          }}
                        >
                          <KeyRound className="mr-1 size-3.5" />
                          초기화
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog
        open={!!resetUser}
        onOpenChange={(v) => {
          if (!v) {
            setResetUser(null);
            setNewPw("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
            <DialogDescription>
              {resetUser?.name || resetUser?.email} 님의 비밀번호를 새로
              설정합니다. 현재 비밀번호는 필요하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-pw">새 비밀번호</Label>
              <Input
                id="reset-pw"
                type="password"
                placeholder="6자 이상"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                disabled={resetting}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetUser(null)}
                disabled={resetting}
              >
                취소
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? "설정 중..." : "초기화"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
