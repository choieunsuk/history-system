// 역사자료부 자료이관 시스템 - 자료 목록 조회 + 생성 API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  serializeMaterial,
  buildRoleVisibilityWhere,
  parseDateOnly,
  endOfDay,
  canManage,
} from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/materials
 * 목록/검색 (페이지네이션, 권한 필터링)
 */
export async function GET(request: NextRequest) {
  try {
    // 세션 검증
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const sp = request.nextUrl.searchParams;
    const q = sp.get("q")?.trim() || undefined;
    const classification = sp.get("classification") || undefined;
    const materialCharacter = sp.get("materialCharacter") || undefined;
    const isPublicParam = sp.get("isPublic");
    const department = sp.get("department")?.trim() || undefined;
    const dateFromStr = sp.get("dateFrom");
    const dateToStr = sp.get("dateTo");

    // 세션에서 userRole 가져오기
    const userRole = session.user.role || "일반인";

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, Number(sp.get("pageSize")) || 10)
    );

    // 권한 기반 가시성 필터 (비공개 숨김 처리)
    const visibilityWhere = buildRoleVisibilityWhere(userRole, isPublicParam);

    // 날짜 필터
    const dateFrom = parseDateOnly(dateFromStr);
    const dateTo = dateToStr
      ? endOfDay(parseDateOnly(dateToStr) ?? new Date(NaN))
      : null;
    const dateRange: Prisma.MaterialWhereInput = {};
    if (dateFrom && dateTo) {
      dateRange.referenceDate = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      dateRange.referenceDate = { gte: dateFrom };
    } else if (dateTo) {
      dateRange.referenceDate = { lte: dateTo };
    }

    const where: Prisma.MaterialWhereInput = {
      AND: [
        visibilityWhere,
        dateRange,
        classification ? { classification } : {},
        materialCharacter ? { materialCharacter } : {},
        department ? { department: { contains: department } } : {},
        q
          ? {
              OR: [
                { title: { contains: q } },
                { searchKeywords: { contains: q } },
              ],
            }
          : {},
      ],
    };

    const [total, rows] = await Promise.all([
      db.material.count({ where }),
      db.material.findMany({
        where,
        include: { attachments: true },
        orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      items: rows.map(serializeMaterial),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err) {
    console.error("[GET /api/materials] error", err);
    return NextResponse.json(
      { error: "자료 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials
 * 자료 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 세션 검증
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 권한 검증 (자료 등록은 관리자·운영자만)
    if (!canManage(session.user.role)) {
      return NextResponse.json(
        { error: "자료를 등록할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "잘못된 요청 본문입니다." },
        { status: 400 }
      );
    }

    const {
      title,
      content,
      department,
      classification,
      materialCharacter,
      isPublic,
      referenceDate,
      representativeImg,
      qrImage,
      searchKeywords,
    } = body as Record<string, unknown>;

    // 필수값 검증
    const missing: string[] = [];
    if (!title || typeof title !== "string") missing.push("title");
    if (!content || typeof content !== "string") missing.push("content");
    if (!department || typeof department !== "string") missing.push("department");
    if (!classification || typeof classification !== "string")
      missing.push("classification");
    if (!materialCharacter || typeof materialCharacter !== "string")
      missing.push("materialCharacter");
    if (!referenceDate || typeof referenceDate !== "string")
      missing.push("referenceDate");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `필수 항목 누락: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const refDate = new Date(referenceDate as string);
    if (Number.isNaN(refDate.getTime())) {
      return NextResponse.json(
        { error: "referenceDate 가 올바른 ISO 문자열이 아닙니다." },
        { status: 400 }
      );
    }

    const created = await db.material.create({
      data: {
        title: title as string,
        content: content as string,
        department: department as string,
        classification: classification as string,
        materialCharacter: materialCharacter as string,
        isPublic: typeof isPublic === "boolean" ? isPublic : true,
        referenceDate: refDate,
        representativeImg:
          typeof representativeImg === "string" ? representativeImg : null,
        qrImage: typeof qrImage === "string" ? qrImage : null,
        searchKeywords:
          typeof searchKeywords === "string" ? searchKeywords : null,
        modifier: session.user.name || session.user.email || "시스템",
      },
      include: { attachments: true },
    });

    return NextResponse.json(serializeMaterial(created), { status: 201 });
  } catch (err) {
    console.error("[POST /api/materials] error", err);
    return NextResponse.json(
      { error: "자료 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
