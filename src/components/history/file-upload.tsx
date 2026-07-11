"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUploadFile, type UploadResult } from "@/hooks/use-materials";
import {
  ALLOWED_FILE_EXTENSIONS,
  BLOCKED_FILE_EXTENSIONS,
  getFileKind,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  FileText,
  ImageIcon,
  Loader2,
  Upload,
  X,
  Paperclip,
  Film,
  Music,
  Archive,
  File,
} from "lucide-react";

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/i;
export function isImageName(name: string): boolean {
  return IMAGE_RE.test(name);
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** 클라이언트 사이드 확장자/크기 사전 검증 (빠른 피드백) */
function validateFile(file: File): string | null {
  if (file.size === 0) return "빈 파일(0 byte)은 업로드할 수 없습니다.";
  if (file.size > MAX_FILE_SIZE) {
    return `파일 크기는 50MB 이하여야 합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  if (!file.name.includes(".")) {
    return "확장자가 없는 파일은 업로드할 수 없습니다.";
  }
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (BLOCKED_FILE_EXTENSIONS.includes(ext)) {
    return `보안상 실행 파일(${ext})은 업로드할 수 없습니다.`;
  }
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return `허용되지 않은 확장자: ${ext}`;
  }
  return null;
}

/** 파일 종류별 아이콘 반환 */
export function getFileIcon(fileName: string) {
  switch (getFileKind(fileName)) {
    case "image":
      return ImageIcon;
    case "video":
      return Film;
    case "audio":
      return Music;
    case "archive":
      return Archive;
    case "document":
      return FileText;
    default:
      return File;
  }
}

/* -------------------------------------------------------------------------- */
/* 단일 이미지 업로드 (대표사진 / QR코드)                                       */
/* -------------------------------------------------------------------------- */

export function SingleImageUpload({
  value,
  onUploaded,
  onClear,
  label,
  hint,
  compact = false,
}: {
  value: string | null;
  onUploaded: (url: string, info: UploadResult) => void;
  onClear: () => void;
  label: string;
  hint?: string;
  compact?: boolean;
}) {
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file?: File) => {
    if (!file) return;
    // 클라이언트 사전 검증
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    // 이미지 필드는 이미지 파일만 허용
    if (!isImageName(file.name)) {
      toast.error(
        `${label}은(는) 이미지 파일(jpg, png, gif 등)만 등록할 수 있습니다.`
      );
      return;
    }
    try {
      const res = await upload.mutateAsync(file);
      onUploaded(res.url, res);
      toast.success(`${label} 업로드 완료`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "업로드 실패");
    }
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50",
            compact ? "h-28" : "h-40"
          )}
        >
          {/* 대표사진/QR 미리보기 이미지 */}
          <img src={value} alt={label} className="h-full w-full object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-white hover:text-rose-600"
            aria-label="이미지 제거"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={upload.isPending}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 text-stone-500 transition hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-700",
        compact ? "h-28" : "h-40",
        upload.isPending && "pointer-events-none opacity-70"
      )}
    >
      {upload.isPending ? (
        <>
          <Loader2 className="size-5 animate-spin text-amber-600" />
          <span className="text-xs">업로드 중…</span>
        </>
      ) : (
        <>
          <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-200">
            <ImageIcon className="size-4 text-amber-600" />
          </div>
          <span className="text-xs font-medium">{label} 선택</span>
          {hint ? (
            <span className="px-3 text-center text-[11px] text-stone-400">
              {hint}
            </span>
          ) : null}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 다중 첨부파일 업로드                                                         */
/* -------------------------------------------------------------------------- */

export interface AttachmentItem {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export function AttachmentUpload({
  value,
  onChange,
  max = 10,
}: {
  value: AttachmentItem[];
  onChange: (next: AttachmentItem[]) => void;
  max?: number;
}) {
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = max - value.length;
    if (room <= 0) {
      toast.warning(`첨부파일은 최대 ${max}개까지 등록할 수 있습니다.`);
      return;
    }
    const list = Array.from(files).slice(0, room);
    if (Array.from(files).length > room) {
      toast.warning(`첨부파일은 최대 ${max}개까지 등록할 수 있습니다.`);
    }
    setBusy(true);
    const added: AttachmentItem[] = [];
    for (const f of list) {
      // 클라이언트 사전 검증
      const err = validateFile(f);
      if (err) {
        toast.error(`${f.name} — ${err}`);
        continue;
      }
      try {
        const res = await upload.mutateAsync(f);
        added.push({
          url: res.url,
          fileName: res.fileName,
          fileType: res.fileType,
          fileSize: res.fileSize,
        });
      } catch (e) {
        toast.error(
          `${f.name} 업로드 실패${e instanceof Error ? ` — ${e.message}` : ""}`
        );
      }
    }
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(`${added.length}개 파일 첨부 완료`);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy || value.length >= max}
          className="h-8 gap-1.5 border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Paperclip className="size-3.5 text-amber-600" />
          )}
          파일 추가
        </Button>
        <span className="text-xs text-stone-400">
          {value.length}/{max}개 · 최대 50MB · PDF/문서/이미지/영상/음성
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {value.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-stone-200 bg-stone-50/50 px-3 py-3 text-xs text-stone-400">
          <Upload className="size-3.5" />
          첨부된 파일이 없습니다. 파일 추가 버튼을 눌러 업로드하세요.
        </div>
      ) : (
        <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {value.map((f, i) => {
            const Icon = getFileIcon(f.fileName);
            const isImg = getFileKind(f.fileName) === "image";
            return (
              <li
                key={`${f.url}-${i}`}
                className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded",
                    isImg
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-stone-700">
                  {f.fileName}
                </span>
                <span className="shrink-0 text-stone-400">
                  {formatBytes(f.fileSize)}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`${f.fileName} 제거`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
