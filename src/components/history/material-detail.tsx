"use client";

import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Download,
  FileText,
  Hash,
  ImageIcon,
  Lock,
  Pencil,
  ScanLine,
  Trash2,
  UserCog,
} from "lucide-react";

import { useMaterial } from "@/hooks/use-materials";
import { useRoleStore } from "@/hooks/use-role";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useDeleteMaterial } from "@/hooks/use-materials";
import { useState } from "react";
import { ClassificationBadge } from "./classification-badge";
import { PublicBadge } from "./dashboard";
import { formatDate, formatDateTime } from "./format";
import { formatBytes } from "./file-upload";

export function MaterialDetail({
  id,
  onClose,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const role = useRoleStore((s) => s.role);
  const roleInfo = ROLES.find((r) => r.value === role);
  const canManage = !!roleInfo?.canManage;
  const { data, isLoading, isError, refetch } = useMaterial(id, role);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-3xl">
        <DialogHeader className="flex-row items-start justify-between gap-3 border-b border-stone-200 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>자료 상세</span>
              {data ? (
                <>
                  <span className="text-stone-300">|</span>
                  <span>등록번호 {data.id.slice(0, 8)}</span>
                </>
              ) : null}
            </div>
            <DialogTitle className="mt-1 line-clamp-2 text-lg font-semibold text-stone-800">
              {data?.title ?? "자료 조회"}
            </DialogTitle>
          </div>
          {data ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <ClassificationBadge code={data.classification} />
              <PublicBadge isPublic={data.isPublic} />
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-stone-500">
                자료를 불러오지 못했습니다. 권한이 부족하거나 자료가 존재하지 않을
                수 있습니다.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                다시 시도
              </Button>
            </div>
          ) : !data ? (
            <p className="py-16 text-center text-sm text-stone-400">
              자료가 없습니다.
            </p>
          ) : (
            <DetailBody data={data} />
          )}
        </div>

        {data && canManage ? (
          <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-6 py-4">
            <DeleteButton id={data.id} title={data.title} onDone={onClose} />
            <Button
              size="sm"
              onClick={() => onEdit(data.id)}
              className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800"
            >
              <Pencil className="size-3.5" />
              수정
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({ data }: { data: NonNullable<ReturnType<typeof useMaterial>["data"]> }) {
  const keywords = (data.searchKeywords ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const hasHtml = /<[a-z][\s\S]*?>/i.test(data.content);

  return (
    <div className="space-y-5">
      {/* 메타 정보 */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 bg-stone-50/50 p-4 sm:grid-cols-2">
        <Meta icon={Building2} label="소관부서" value={data.department} />
        <Meta
          icon={CalendarDays}
          label="기준일자"
          value={formatDate(data.referenceDate)}
        />
        <Meta
          icon={FileText}
          label="자료성격"
          value={data.materialCharacter}
        />
        <Meta
          icon={Lock}
          label="공개여부"
          value={data.isPublic ? "공개" : "비공개"}
        />
        <Meta
          icon={UserCog}
          label="수정자"
          value={data.modifier || "—"}
        />
        <Meta
          icon={CalendarDays}
          label="수정일자"
          value={formatDateTime(data.modifiedDate)}
        />
      </div>

      {/* 본문 */}
      <section>
        <h4 className="mb-2 text-sm font-semibold text-stone-700">자료내용</h4>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          {hasHtml ? (
            <div
              className="text-sm leading-relaxed text-stone-700
                [&_a]:text-amber-700 [&_a]:underline [&_a:hover]:text-amber-800
                [&_b]:font-semibold [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              // 자체 에디터에서 입력된 신뢰된 콘텐츠이므로 HTML 렌더링
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {data.content}
            </p>
          )}
        </div>
      </section>

      {/* 검색 키워드 */}
      {keywords.length > 0 ? (
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-700">
            <Hash className="size-3.5 text-stone-400" />
            검색 키워드
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k, i) => (
              <Badge
                key={`${k}-${i}`}
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800"
              >
                #{k}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {/* 이미지 */}
      {(data.representativeImg || data.qrImage) && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.representativeImg ? (
            <ImageBlock
              label="대표사진"
              icon={ImageIcon}
              url={data.representativeImg}
              alt={data.title}
            />
          ) : null}
          {data.qrImage ? (
            <ImageBlock
              label="QR코드 (기물자료)"
              icon={ScanLine}
              url={data.qrImage}
              alt="QR 코드"
              small
            />
          ) : null}
        </section>
      )}

      {/* 첨부파일 */}
      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-700">
          <FileText className="size-3.5 text-stone-400" />
          첨부파일 {data.attachments?.length ? `(${data.attachments.length})` : ""}
        </h4>
        {data.attachments && data.attachments.length > 0 ? (
          <ul className="space-y-1.5">
            {data.attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <FileText className="size-4 shrink-0 text-amber-600" />
                <a
                  href={a.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-stone-700 hover:text-amber-700 hover:underline"
                  download={a.fileName}
                >
                  {a.fileName}
                </a>
                <span className="shrink-0 text-xs text-stone-400">
                  {formatBytes(a.fileSize)}
                </span>
                <a
                  href={a.filePath}
                  target="_blank"
                  rel="noreferrer"
                  download={a.fileName}
                  className="inline-flex size-7 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label={`${a.fileName} 다운로드`}
                >
                  <Download className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-stone-200 bg-stone-50/50 px-3 py-3 text-xs text-stone-400">
            첨부된 파일이 없습니다.
          </p>
        )}
      </section>

      {/* 등록/수정 이력 */}
      <section className="rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 text-xs text-stone-500">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div>
            최초 등록:{" "}
            <span className="font-medium text-stone-700">
              {formatDateTime(data.createdAt)}
            </span>
          </div>
          <div>
            최종 수정:{" "}
            <span className="font-medium text-stone-700">
              {formatDateTime(data.modifiedDate)}
            </span>{" "}
            ({data.modifier || "—"})
          </div>
        </div>
      </section>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-amber-600 ring-1 ring-stone-200">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-stone-400">{label}</p>
        <p className="truncate text-sm font-medium text-stone-700">{value}</p>
      </div>
    </div>
  );
}

function ImageBlock({
  label,
  icon: Icon,
  url,
  alt,
  small,
}: {
  label: string;
  icon: typeof ImageIcon;
  url: string;
  alt: string;
  small?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
        <Icon className="size-3.5 text-stone-400" />
        {label}
      </p>
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-stone-200 bg-stone-50",
          small ? "h-32" : "h-48"
        )}
      >
        {/* 본문 이미지 — 외부 업로드 결과 URL */}
        <img src={url} alt={alt} className="h-full w-full object-contain" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-6 w-20 rounded" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-6 w-24 rounded" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

function DeleteButton({
  id,
  title,
  onDone,
}: {
  id: string;
  title: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const delMut = useDeleteMaterial();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 className="size-3.5" />
        삭제
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
              disabled={delMut.isPending}
              onClick={() =>
                delMut.mutate(id, {
                  onSuccess: () => {
                    toast.success("자료가 삭제되었습니다.");
                    setOpen(false);
                    onDone();
                  },
                  onError: (e) => toast.error(e.message || "삭제 실패"),
                })
              }
            >
              {delMut.isPending ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
