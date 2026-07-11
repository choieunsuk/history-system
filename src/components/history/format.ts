import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

/** ISO → yyyy.MM.dd */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "yyyy.MM.dd");
  } catch {
    return String(iso).slice(0, 10);
  }
}

/** ISO → yyyy.MM.dd HH:mm */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "yyyy.MM.dd HH:mm");
  } catch {
    return String(iso);
  }
}

/** Date → yyyy-MM-dd (input[type=date] 용) */
export function toDateInput(d: Date | undefined | null): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

/** yyyy-MM-dd → 한국어 표시 (yyyy년 M월 d일) */
export function formatKorean(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "yyyy년 M월 d일", { locale: ko });
  } catch {
    return String(iso);
  }
}
