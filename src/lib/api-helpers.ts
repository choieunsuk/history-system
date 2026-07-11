// 역사자료부 자료이관 시스템 - API 공용 헬퍼
import type { Material, Attachment, Prisma } from "@prisma/client";
import type {
  MaterialRecord,
  MaterialAttachment,
} from "./constants";
import { PRIVATE_VIEW_ROLES } from "./constants";

export type MaterialWithAttachments = Material & { attachments: Attachment[] };

/**
 * Prisma Material(+attachments) 객체를 프런트엔드용 MaterialRecord 직렬화.
 * - Date 필드는 ISO 문자열로 변환
 * - isPublic Boolean 변환 (SQLite 0/1 → boolean)
 * - attachments 정리
 */
export function serializeMaterial(
  m: MaterialWithAttachments
): MaterialRecord {
  return {
    id: m.id,
    title: m.title,
    content: m.content,
    department: m.department,
    classification: m.classification,
    materialCharacter: m.materialCharacter,
    isPublic: Boolean(m.isPublic),
    referenceDate: m.referenceDate.toISOString(),
    representativeImg: m.representativeImg,
    qrImage: m.qrImage,
    searchKeywords: m.searchKeywords,
    modifier: m.modifier,
    modifiedDate: m.modifiedDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    attachments: m.attachments.map(
      (a): MaterialAttachment => ({
        id: a.id,
        fileName: a.fileName,
        filePath: a.filePath,
        fileType: a.fileType,
        fileSize: a.fileSize,
      })
    ),
  };
}

/**
 * 비공개 자료 조회 권한이 있는 역할인지 검사
 */
export function canViewPrivate(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  return PRIVATE_VIEW_ROLES.includes(userRole as never);
}

/**
 * 역할에 따른 isPublic 필터를 반환.
 * - 비공개 조회 권한 없는 역할: 항상 { isPublic: true } (비공개 숨김)
 * - 비공개 조회 권한 있는 역할: 명시된 isPublic 값 또는 undefined(전체)
 */
export function buildRoleVisibilityWhere(
  userRole: string | null | undefined,
  isPublicParam?: string | null
): Prisma.MaterialWhereInput {
  if (canViewPrivate(userRole)) {
    // 권한 있음 - isPublic 파라미터 존중
    if (isPublicParam === "true") return { isPublic: true };
    if (isPublicParam === "false") return { isPublic: false };
    return {};
  }
  // 권한 없음 - 공개만 노출
  return { isPublic: true };
}

/**
 * yyyy-mm-dd 문자열을 Date 로 변환 (로컬 자정 기준).
 * 잘못된 입력은 null 반환.
 */
export function parseDateOnly(s?: string | null): Date | null {
  if (!s) return null;
  // yyyy-mm-dd 검증
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * dateTo 를 해당 일자의 마지막 순간(23:59:59.999)으로 변환
 */
export function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}
