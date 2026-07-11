"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, QrCode, Sparkles, X } from "lucide-react";

import { useGenerateQr, type QrGenerateResult } from "@/hooks/use-materials";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * QR 코드 자동 생성 업로더
 * - "QR 자동 생성" 버튼 클릭 → 다이얼로그에서 인코딩할 텍스트 입력
 * - 서버 /api/qr-generate 에서 PNG 생성 → URL 반환
 * - 파일 업로드 없이 자동 생성, 미리보기 + 제거 지원
 *
 * PPTX 요구사항: "QR코드 (기물자료)" — 기물 자료 식별용 QR
 */
export function QrGenerator({
  value,
  onGenerated,
  onClear,
  hint,
  compact = false,
  defaultText,
}: {
  value: string | null;
  onGenerated: (url: string, info: QrGenerateResult) => void;
  onClear: () => void;
  hint?: string;
  compact?: boolean;
  defaultText?: string;
}) {
  const gen = useGenerateQr();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(defaultText ?? "");

  const handleGenerate = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("QR에 인코딩할 텍스트를 입력하세요.");
      return;
    }
    try {
      const res = await gen.mutateAsync({ text: trimmed, size: 320 });
      onGenerated(res.url, res);
      toast.success("QR 코드가 생성되었습니다.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "QR 생성 실패");
    }
  };

  // 이미 QR 이미지가 있는 경우 미리보기 + 제거
  if (value) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50",
            compact ? "h-28" : "h-40"
          )}
        >
          <img
            src={value}
            alt="QR 코드"
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-white hover:text-rose-600"
            aria-label="QR 코드 제거"
          >
            <X className="size-3.5" />
          </button>
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-stone-800/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <QrCode className="size-3" />
            자동 생성됨
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={gen.isPending}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 text-stone-500 transition hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-700",
          compact ? "h-28" : "h-40",
          gen.isPending && "pointer-events-none opacity-70"
        )}
      >
        {gen.isPending ? (
          <>
            <Loader2 className="size-5 animate-spin text-amber-600" />
            <span className="text-xs">QR 생성 중…</span>
          </>
        ) : (
          <>
            <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-200">
              <QrCode className="size-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium">QR 자동 생성</span>
            {hint ? (
              <span className="px-3 text-center text-[11px] text-stone-400">
                {hint}
              </span>
            ) : null}
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-800">
              <Sparkles className="size-4 text-amber-600" />
              QR 코드 자동 생성
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              인코딩할 텍스트를 입력하면 서버에서 QR 코드 PNG 이미지를 생성합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="qr-text" className="text-sm text-stone-700">
                QR 인코딩 내용
              </Label>
              <Input
                id="qr-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="예: 자료ID, 자료 URL, 비고 텍스트"
                className="bg-white"
                autoFocus
              />
              <p className="text-[11px] text-stone-400">
                기물 자료 식별용 — 자료 ID나 참조 URL을 권장합니다. (최대 2048자)
              </p>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-800">
              <span className="font-medium">💡 팁:</span> 자료 ID, 자료 상세
              페이지 URL, 또는 보존 위치 코드를 입력하면 스캔 시 해당 자료를
              빠르게 식별할 수 있습니다.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
            >
              취소
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={gen.isPending || !text.trim()}
              className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800"
            >
              {gen.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <QrCode className="size-4" />
              )}
              QR 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
