// 역사자료부 자료이관 시스템 - 통계 API
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canViewPrivate, serializeMaterial } from "@/lib/api-helpers";
import {
  CLASSIFICATION_MAP,
  type StatsResponse,
  type ClassificationCategory,
} from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/stats
 * 대시보드 통계 (권한 기반 가시성 적용)
 */
export async function GET(request: NextRequest) {
  try {
    const userRole =
      request.nextUrl.searchParams.get("userRole") || "일반인";
    const viewerCanSeePrivate = canViewPrivate(userRole);

    // 1) 전체 자료 (비공개 가시성 적용)
    const allMaterials = await db.material.findMany({
      include: { attachments: true },
      orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
    });

    // 비공개 가시성 필터링
    const visibleMaterials = viewerCanSeePrivate
      ? allMaterials
      : allMaterials.filter((m) => m.isPublic);

    // 공개/비공개 카운트 (원본 기준)
    const realPublicCount = allMaterials.filter((m) => m.isPublic).length;
    const realPrivateCount = allMaterials.length - realPublicCount;

    const total = visibleMaterials.length;
    const publicCount = realPublicCount;
    const privateCount = viewerCanSeePrivate ? realPrivateCount : 0;

    // 2) byCategory (문서/음영/기물)
    const categoryAgg: Record<string, number> = { 문서: 0, 음영: 0, 기물: 0 };
    for (const m of visibleMaterials) {
      const cls = CLASSIFICATION_MAP[m.classification];
      if (cls) {
        categoryAgg[cls.category] = (categoryAgg[cls.category] ?? 0) + 1;
      }
    }
    const byCategory = (
      Object.keys(categoryAgg) as ClassificationCategory[]
    ).map((category) => ({ category, count: categoryAgg[category] }));

    // 3) byCharacter (자료성격)
    const characterAgg = new Map<string, number>();
    for (const m of visibleMaterials) {
      characterAgg.set(
        m.materialCharacter,
        (characterAgg.get(m.materialCharacter) ?? 0) + 1
      );
    }
    const byCharacter = Array.from(characterAgg.entries())
      .map(([character, count]) => ({ character, count }))
      .sort((a, b) => b.count - a.count);

    // 4) byMonth (최근 12개월, YYYY-MM)
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(ym);
    }
    const monthAgg = new Map<string, number>(months.map((m) => [m, 0]));
    for (const m of visibleMaterials) {
      const d = m.referenceDate;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthAgg.has(ym)) {
        monthAgg.set(ym, (monthAgg.get(ym) ?? 0) + 1);
      }
    }
    const byMonth = months.map((month) => ({
      month,
      count: monthAgg.get(month) ?? 0,
    }));

    // 5) recentMaterials (최신 5건)
    const recentMaterials = visibleMaterials.slice(0, 5).map(serializeMaterial);

    const payload: StatsResponse = {
      total,
      publicCount,
      privateCount,
      byCategory,
      byCharacter,
      recentMaterials,
      byMonth,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/stats] error", err);
    return NextResponse.json(
      { error: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
