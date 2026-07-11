"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import {
  CalendarIcon,
  Loader2,
  Save,
  Trash2,
  Info,
} from "lucide-react";

import {
  useCreateMaterial,
  useDeleteMaterial,
  useMaterial,
  useUpdateMaterial,
  type MaterialInputBody,
} from "@/hooks/use-materials";
import { useRoleStore } from "@/hooks/use-role";
import {
  CLASSIFICATIONS,
  MATERIAL_CHARACTERS,
  MAX_ATTACHMENTS,
  type ClassificationCategory,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AttachmentUpload,
  type AttachmentItem,
  SingleImageUpload,
} from "./file-upload";
import { QrGenerator } from "./qr-generator";
import { formatDate, formatDateTime } from "./format";

const CATEGORY_GROUPS: {
  category: ClassificationCategory;
  items: typeof CLASSIFICATIONS;
}[] = (["문서", "음영", "기물"] as ClassificationCategory[]).map((c) => ({
  category: c,
  items: CLASSIFICATIONS.filter((x) => x.category === c),
}));

interface FormState {
  title: string;
  content: string;
  department: string;
  classification: string;
  materialCharacter: string;
  isPublic: boolean;
  referenceDate: Date | undefined;
  representativeImg: string | null;
  qrImage: string | null;
  searchKeywords: string;
  attachments: AttachmentItem[];
}

const EMPTY: FormState = {
  title: "",
  content: "",
  department: "",
  classification: "",
  materialCharacter: "",
  isPublic: true,
  referenceDate: new Date(),
  representativeImg: null,
  qrImage: null,
  searchKeywords: "",
  attachments: [],
};

export function MaterialForm({
  open,
  id,
  onClose,
}: {
  open: boolean;
  id: string | null; // null = 신규 등록
  onClose: () => void;
}) {
  // 다이얼로그는 항상 마운트된 상태를 유지(애니메이션/상태 보존)하되,
  // 폼 본문은 열릴 때만 렌더링하고 key 로 id 변경 시 재마운트하여
  // 상태를 깨끗하게 초기화합니다.
  return (
    <MaterialFormDialog open={open} id={id} onClose={onClose}>
      {open ? <MaterialFormBody key={id ?? "new"} id={id} onClose={onClose} /> : null}
    </MaterialFormDialog>
  );
}

function MaterialFormDialog({
  open,
  id,
  onClose,
  children,
}: {
  open: boolean;
  id: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isEdit = !!id;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-3xl">
        {/* 헤더 */}
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-stone-200 px-6 py-4">
          <div>
            <DialogTitle className="text-lg font-semibold text-stone-800">
              {isEdit ? "자료 수정" : "자료 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              역사자료부 자료이관 — 모든 입력항목 필수 (QR코드 제외)
            </DialogDescription>
          </div>
          {isEdit ? (
            <span className="hidden rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-500 sm:inline-block">
              수정자 자동 표기
            </span>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function initFromExisting(existing: NonNullable<ReturnType<typeof useMaterial>["data"]>): FormState {
  return {
    title: existing.title ?? "",
    content: existing.content ?? "",
    department: existing.department ?? "",
    classification: existing.classification ?? "",
    materialCharacter: existing.materialCharacter ?? "",
    isPublic: existing.isPublic,
    referenceDate: safeParseDate(existing.referenceDate),
    representativeImg: existing.representativeImg ?? null,
    qrImage: existing.qrImage ?? null,
    searchKeywords: existing.searchKeywords ?? "",
    attachments: (existing.attachments ?? []).map((a) => ({
      url: a.filePath,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
    })),
  };
}

function MaterialFormBody({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const role = useRoleStore((s) => s.role);
  const isEdit = !!id;
  const { data: existing, isLoading } = useMaterial(isEdit ? id : null, role);

  const createMut = useCreateMaterial();
  const updateMut = useUpdateMaterial();
  const deleteMut = useDeleteMaterial();

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    referenceDate: new Date(),
  }));
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 서버에서 불러온 existing 데이터로 폼을 채웁니다.
  // 렌더 중 상태 조정 패턴(React 권장) — existing 이 도착/변경될 때 1회만 동기화.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  const syncKey = existing
    ? `${existing.id}:${existing.modifiedDate ?? existing.createdAt}`
    : null;
  if (isEdit && syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    if (existing) setForm(initFromExisting(existing));
    setErrors({});
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!form.title.trim()) e.title = true;
    if (!form.content.trim()) e.content = true;
    if (!form.department.trim()) e.department = true;
    if (!form.classification) e.classification = true;
    if (!form.materialCharacter) e.materialCharacter = true;
    if (!form.referenceDate) e.referenceDate = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("필수 항목을 모두 입력해 주세요. (QR코드 제외)");
      return false;
    }
    return true;
  };

  const buildBody = (): MaterialInputBody => ({
    title: form.title.trim(),
    content: form.content,
    department: form.department.trim(),
    classification: form.classification,
    materialCharacter: form.materialCharacter,
    isPublic: form.isPublic,
    referenceDate: form.referenceDate
      ? form.referenceDate.toISOString()
      : new Date().toISOString(),
    representativeImg: form.representativeImg,
    qrImage: form.qrImage,
    searchKeywords: form.searchKeywords.trim() || null,
    attachments: form.attachments.map((a) => ({
      fileName: a.fileName,
      filePath: a.url,
      fileType: a.fileType,
      fileSize: a.fileSize,
    })),
  });

  const handleSave = () => {
    if (!validate()) return;
    const body = buildBody();
    if (isEdit && id) {
      updateMut.mutate(
        { id, body },
        {
          onSuccess: () => {
            toast.success("자료가 수정되었습니다.");
            onClose();
          },
          onError: (e) => toast.error(e.message || "수정 실패"),
        }
      );
    } else {
      createMut.mutate(body, {
        onSuccess: () => {
          toast.success("자료가 등록되었습니다.");
          onClose();
        },
        onError: (e) => toast.error(e.message || "등록 실패"),
      });
    }
  };

  const handleDelete = () => {
    if (!id) return;
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast.success("자료가 삭제되었습니다.");
        setConfirmDelete(false);
        onClose();
      },
      onError: (e) => toast.error(e.message || "삭제 실패"),
    });
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <>
      {/* 본문 (스크롤) */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isEdit && isLoading ? (
          <FormSkeleton />
        ) : (
          <div className="space-y-5">
            {/* 자료제목 */}
            <FieldGroup
              label="자료제목"
              required
              error={errors.title}
              hint="자료를 대표하는 명칭"
            >
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="예: 1985년 부활절 새벽 예배 설교 녹음"
                className={cn("bg-white", errors.title && "border-rose-400")}
              />
            </FieldGroup>

              {/* 자료내용 */}
              <FieldGroup
                label="자료내용"
                required
                error={errors.content}
                hint="HTML 태그 사용 가능 (본문 단락/강조 등)"
              >
                <Textarea
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder="자료에 대한 상세 설명을 입력하세요."
                  className={cn(
                    "min-h-32 bg-white font-mono text-sm leading-relaxed",
                    errors.content && "border-rose-400"
                  )}
                />
              </FieldGroup>

              {/* 소관부서 + 기준일자 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldGroup
                  label="소관부서"
                  required
                  error={errors.department}
                >
                  <Input
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                    placeholder="예: 역사자료부"
                    className={cn("bg-white", errors.department && "border-rose-400")}
                  />
                </FieldGroup>
                <FieldGroup
                  label="기준일자"
                  required
                  error={errors.referenceDate}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 w-full justify-start gap-2 bg-white text-left font-normal",
                          !form.referenceDate && "text-stone-400",
                          errors.referenceDate && "border-rose-400"
                        )}
                      >
                        <CalendarIcon className="size-4 text-amber-600" />
                        {form.referenceDate
                          ? format(form.referenceDate, "yyyy년 M월 d일", {
                              locale: ko,
                            })
                          : "기준일자 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.referenceDate}
                        onSelect={(d) => set("referenceDate", d ?? undefined)}
                        captionLayout="dropdown"
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </FieldGroup>
              </div>

              {/* 자료분류 + 자료성격 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldGroup
                  label="자료분류"
                  required
                  error={errors.classification}
                >
                  <Select
                    value={form.classification}
                    onValueChange={(v) => set("classification", v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full bg-white",
                        errors.classification && "border-rose-400"
                      )}
                    >
                      <SelectValue placeholder="분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
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
                </FieldGroup>
                <FieldGroup
                  label="자료성격"
                  required
                  error={errors.materialCharacter}
                >
                  <Select
                    value={form.materialCharacter}
                    onValueChange={(v) => set("materialCharacter", v)}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full bg-white",
                        errors.materialCharacter && "border-rose-400"
                      )}
                    >
                      <SelectValue placeholder="성격 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CHARACTERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              {/* 공개여부 */}
              <FieldGroup
                label="공개여부"
                required
                hint="비공개 자료는 권한 보유자(교역자/장로/안수집사·권사)만 조회 가능"
              >
                <RadioGroup
                  value={form.isPublic ? "public" : "private"}
                  onValueChange={(v) => set("isPublic", v === "public")}
                  className="flex flex-row gap-6"
                >
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      form.isPublic
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-white text-stone-600"
                    )}
                  >
                    <RadioGroupItem value="public" />
                    공개
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      !form.isPublic
                        ? "border-stone-400 bg-stone-100 text-stone-800"
                        : "border-stone-200 bg-white text-stone-600"
                    )}
                  >
                    <RadioGroupItem value="private" />
                    비공개
                  </label>
                </RadioGroup>
              </FieldGroup>

              {/* 검색키워드 */}
              <FieldGroup label="검색키워드" hint="쉼표(,)로 구분하여 입력">
                <Input
                  value={form.searchKeywords}
                  onChange={(e) => set("searchKeywords", e.target.value)}
                  placeholder="예: 부활절, 설교, 1985"
                  className="bg-white"
                />
              </FieldGroup>

              {/* 이미지 업로드 영역 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldGroup label="대표사진" hint="권장 크기 1200×800 이하">
                  <SingleImageUpload
                    label="대표사진"
                    value={form.representativeImg}
                    onUploaded={(url) => set("representativeImg", url)}
                    onClear={() => set("representativeImg", null)}
                  />
                </FieldGroup>
                <FieldGroup
                  label="QR코드"
                  hint="기물 자료용 — 자동 생성 또는 이미지 업로드"
                >
                  <QrGenerator
                    value={form.qrImage}
                    onGenerated={(url) => set("qrImage", url)}
                    onClear={() => set("qrImage", null)}
                    compact
                    defaultText={
                      form.title
                        ? `[${form.classification || "자료"}] ${form.title}`
                        : undefined
                    }
                  />
                </FieldGroup>
              </div>

              {/* 첨부파일 */}
              <FieldGroup
                label={`첨부파일 (최대 ${MAX_ATTACHMENTS}개)`}
                hint="PDF 권장. 문서/이미지/영상 파일 첨부 가능"
              >
                <AttachmentUpload
                  value={form.attachments}
                  onChange={(next) => set("attachments", next)}
                  max={MAX_ATTACHMENTS}
                />
              </FieldGroup>

              {/* 수정자 정보 (read-only) */}
              {isEdit && existing ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                    <Info className="size-3.5 text-stone-400" />
                    수정 정보 (자동 표기)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 sm:grid-cols-3">
                    <div>
                      <span className="text-stone-400">수정자: </span>
                      <span className="font-medium text-stone-700">
                        {existing.modifier || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400">수정일자: </span>
                      <span className="font-medium text-stone-700">
                        {formatDateTime(existing.modifiedDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400">최초 등록: </span>
                      <span className="font-medium text-stone-700">
                        {formatDate(existing.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3 text-xs text-stone-500">
                  <Info className="size-3.5 text-stone-400" />
                  수정자·수정일자는 저장 시 자동으로 표기됩니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-stone-200 px-6 py-4">
          {isEdit ? (
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMut.isPending}
              className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="size-4" />
              삭제
            </Button>
          ) : (
            <span className="text-xs text-stone-400">* 필수 입력 항목</span>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isEdit ? "수정 저장" : "등록"}
            </Button>
          </div>
        </DialogFooter>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              자료 「{form.title || existing?.title}」를 삭제하시겠습니까? 이 작업은
              되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function safeParseDate(iso?: string | null): Date | undefined {
  if (!iso) return undefined;
  try {
    const d = parseISO(iso);
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

function FieldGroup({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm font-medium text-stone-700">
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </Label>
        {hint ? (
          <span className="text-[11px] text-stone-400">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-500">필수 입력 항목입니다.</p>
      ) : null}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
