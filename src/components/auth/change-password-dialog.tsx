"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (next.length < 6) {
      toast.error("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "비밀번호 변경에 실패했습니다.");
      toast.success("비밀번호가 변경되었습니다.");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>
            현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cur-pw">현재 비밀번호</Label>
            <Input
              id="cur-pw"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">새 비밀번호</Label>
            <Input
              id="new-pw"
              type="password"
              placeholder="6자 이상"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">새 비밀번호 확인</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "변경 중..." : "변경"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
