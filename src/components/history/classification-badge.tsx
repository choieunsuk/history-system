"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CLASSIFICATION_MAP,
  type ClassificationCategory,
} from "@/lib/constants";

const CATEGORY_DOT: Record<ClassificationCategory, string> = {
  문서: "bg-amber-500",
  음영: "bg-emerald-500",
  기물: "bg-rose-500",
};

const CATEGORY_BADGE: Record<ClassificationCategory, string> = {
  문서: "border-amber-200 bg-amber-50 text-amber-800",
  음영: "border-emerald-200 bg-emerald-50 text-emerald-800",
  기물: "border-rose-200 bg-rose-50 text-rose-800",
};

/**
 * 자료분류 코드를 카테고리 색상 점 + 라벨 배지로 렌더링.
 * code 가 존재하지 않으면 회색 fallback.
 */
export function ClassificationBadge({
  code,
  withCategory = true,
  className,
}: {
  code: string;
  withCategory?: boolean;
  className?: string;
}) {
  const cls = CLASSIFICATION_MAP[code];
  if (!cls) {
    return (
      <Badge
        variant="outline"
        className={cn("border-stone-200 bg-stone-50 text-stone-500", className)}
      >
        {code || "—"}
      </Badge>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {withCategory && (
        <Badge
          variant="outline"
          className={cn("gap-1 text-[10px] font-semibold", CATEGORY_BADGE[cls.category])}
        >
          <span className={cn("size-1.5 rounded-full", CATEGORY_DOT[cls.category])} />
          {cls.category}
        </Badge>
      )}
      <Badge
        variant="outline"
        className="border-stone-200 bg-white text-stone-700 font-medium"
      >
        {cls.label}
      </Badge>
    </span>
  );
}
