// 역사자료부 자료이관 시스템 - 공유 상수 및 타입

// 자료 분류 코드 (대분류: 문서/음영/기물)
export type ClassificationCategory = "문서" | "음영" | "기물";

export interface ClassificationCode {
  code: string;
  label: string;
  category: ClassificationCategory;
}

export const CLASSIFICATIONS: ClassificationCode[] = [
  { code: "0101", label: "문서-출판물", category: "문서" },
  { code: "0102", label: "문서-종이", category: "문서" },
  { code: "0201", label: "음영-사진", category: "음영" },
  { code: "0202", label: "음영-음향", category: "음영" },
  { code: "0203", label: "음영-영상", category: "음영" },
  { code: "0301", label: "기물-일반", category: "기물" },
  { code: "0302", label: "기물-기념물", category: "기물" },
  { code: "0303", label: "기물-역사물", category: "기물" },
  { code: "0304", label: "기물-예술품", category: "기물" },
];

export const CLASSIFICATION_MAP = Object.fromEntries(
  CLASSIFICATIONS.map((c) => [c.code, c])
);

// 자료 성격
export const MATERIAL_CHARACTERS = [
  "일반",
  "예배/설교",
  "교육/회의",
  "세미나/워크샵",
] as const;

export type MaterialCharacter = (typeof MATERIAL_CHARACTERS)[number];

// 공개 여부
export const PUBLIC_OPTIONS = [
  { value: true, label: "공개" },
  { value: false, label: "비공개" },
] as const;

// 권한 등급 (Jenkins 유사 3단계 — 높을수록 권한 상위)
// - 관리자: 모든 권한 (자료 CRUD + 비공개 조회 + 사용자·권한 관리)
// - 운영자: 자료 등록·변경·삭제 + 비공개 조회
// - 일반  : 읽기 전용 (공개 자료만 조회)
export const ROLES = [
  { value: "관리자", label: "관리자", level: 3, canManage: true, canViewPrivate: true, canAdmin: true, description: "모든 권한 — 자료 관리 + 사용자·권한 관리" },
  { value: "운영자", label: "운영자", level: 2, canManage: true, canViewPrivate: true, canAdmin: false, description: "자료 등록·변경·삭제 + 비공개 조회" },
  { value: "일반", label: "일반", level: 1, canManage: false, canViewPrivate: false, canAdmin: false, description: "공개 자료 읽기 전용" },
] as const;

export type RoleValue = (typeof ROLES)[number]["value"];

// 신규 가입자·미지정 사용자의 기본 권한 (최소 권한)
export const DEFAULT_ROLE: RoleValue = "일반";

// 관리 권한 보유 여부 (자료 등록/수정/삭제 가능)
export const MANAGEMENT_ROLES = ROLES.filter((r) => r.canManage).map((r) => r.value);

// 비공개 자료 조회 가능 여부
export const PRIVATE_VIEW_ROLES = ROLES.filter((r) => r.canViewPrivate).map((r) => r.value);

// 사용자·권한 관리(관리자 콘솔) 접근 가능 여부
export const ADMIN_ROLES = ROLES.filter((r) => r.canAdmin).map((r) => r.value);

// 레거시(교회 직분) 권한명 → 신규 3단계 매핑.
// 기존 DB/세션에 남아있는 옛 role 값을 안전하게 변환하기 위한 표.
const LEGACY_ROLE_MAP: Record<string, RoleValue> = {
  교역자: "관리자",
  장로: "운영자",
  "안수집사/권사": "일반",
  서리집사: "일반",
  등록교인: "일반",
  일반인: "일반",
};

/**
 * 임의의 role 문자열을 유효한 RoleValue 로 정규화.
 * - 신규 3단계 중 하나면 그대로
 * - 레거시 직분명이면 매핑
 * - 그 외 알 수 없는 값은 최소 권한(DEFAULT_ROLE)
 */
export function normalizeRole(role: string | null | undefined): RoleValue {
  if (!role) return DEFAULT_ROLE;
  if (ROLES.some((r) => r.value === role)) return role as RoleValue;
  return LEGACY_ROLE_MAP[role] ?? DEFAULT_ROLE;
}

// 첨부 파일 최대 개수
export const MAX_ATTACHMENTS = 10;

// 허용 파일 확장자 (대소문자 무관, 소문자로 비교)
// PPTX 요구사항: "모든 문서자료는 PDF, PPT, DOC, XLS 등 국제 표준문서로 변환하여 Upload"
// HWP는 색인 불가로 원칙 차단이나, 보존 목적 업로드는 허용(PDF 변환 권장 안내는 UI에서 처리)
export const ALLOWED_FILE_EXTENSIONS = [
  // 문서
  ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx",
  ".hwp", ".txt", ".rtf", ".csv",
  // 이미지
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif",
  // 영상/음향
  ".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".m4a", ".ogg", ".flac",
  // 압축/기타
  ".zip", ".json",
];

// 업로드 차단 확장자 (보안상 위험한 실행 파일)
export const BLOCKED_FILE_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".js", ".mjs", ".jar", ".msi", ".dll", ".so",
];

// 파일 종류 분류 (UI 아이콘/표시용)
export function getFileKind(fileName: string): "image" | "video" | "audio" | "document" | "archive" | "other" {
  const ext = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "tif"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  if (["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "hwp", "txt", "rtf", "csv"].includes(ext)) return "document";
  if (["zip"].includes(ext)) return "archive";
  return "other";
}

// 카테고리 색상 (UI용 - warm archival palette)
export const CATEGORY_COLORS: Record<ClassificationCategory, string> = {
  문서: "amber",
  음영: "emerald",
  기물: "rose",
};

// Material 타입 (프런트엔드/백엔드 공용)
export interface MaterialAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
}

export interface MaterialRecord {
  id: string;
  title: string;
  content: string;
  department: string;
  classification: string;
  materialCharacter: string;
  isPublic: boolean;
  referenceDate: string; // ISO string
  representativeImg: string | null;
  qrImage: string | null;
  searchKeywords: string | null;
  modifier: string;
  modifiedDate: string;
  createdAt: string;
  attachments: MaterialAttachment[];
}

// 목록 조회 파라미터
export interface MaterialListParams {
  q?: string; // 검색어 (제목/키워드)
  classification?: string; // 분류 코드
  materialCharacter?: string; // 자료성격
  isPublic?: string; // "true" | "false" | undefined
  department?: string;
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
  page?: number;
  pageSize?: number;
  userRole?: string; // 호출자 권한 (비공개 필터링)
}

export interface MaterialListResponse {
  items: MaterialRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 통계
export interface StatsResponse {
  total: number;
  publicCount: number;
  privateCount: number;
  byCategory: { category: string; count: number }[];
  byCharacter: { character: string; count: number }[];
  recentMaterials: MaterialRecord[];
  byMonth: { month: string; count: number }[];
}
