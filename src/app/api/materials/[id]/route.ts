// 역사자료부 자료이관 시스템 - 자료 상세 조회/수정/삭제 API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeMaterial, canViewPrivate, canManage } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/materials/[id]
 * 단일 자료 조회. 비공개 자료는 권한 없는 역할에게 403.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 세션 검증
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    const userRole = session.user.role;

    const material = await db.material.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!material) {
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 비공개 자료 권한 검사
    if (!material.isPublic && !canViewPrivate(userRole)) {
      return NextResponse.json(
        { error: "이 자료를 조회할 권한이 없습니다." },
        { status: 403 }
      );
    }

    return NextResponse.json(serializeMaterial(material));
  } catch (err) {
    console.error("[GET /api/materials/[id]] error", err);
    return NextResponse.json(
      { error: "자료 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/materials/[id]
 * 자료 수정. 모든 필드 선택적. modifier="시스템", modifiedDate 자동 갱신.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 세션 + 권한 검증 (자료 수정은 관리자·운영자만)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    if (!canManage(session.user.role)) {
      return NextResponse.json(
        { error: "자료를 수정할 권한이 없습니다." },
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

    const existing = await db.material.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 }
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

    // 업데이트할 필드 조립 (전달된 필드만)
    const data: Record<string, unknown> = {
      modifier: session.user.name || session.user.email || "시스템",
    };
    if (typeof title === "string") data.title = title;
    if (typeof content === "string") data.content = content;
    if (typeof department === "string") data.department = department;
    if (typeof classification === "string") data.classification = classification;
    if (typeof materialCharacter === "string")
      data.materialCharacter = materialCharacter;
    if (typeof isPublic === "boolean") data.isPublic = isPublic;
    if (typeof referenceDate === "string") {
      const d = new Date(referenceDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "referenceDate 가 올바른 ISO 문자열이 아닙니다." },
          { status: 400 }
        );
      }
      data.referenceDate = d;
    }
    if (representativeImg === null || typeof representativeImg === "string") {
      data.representativeImg = representativeImg;
    }
    if (qrImage === null || typeof qrImage === "string") {
      data.qrImage = qrImage;
    }
    if (searchKeywords === null || typeof searchKeywords === "string") {
      data.searchKeywords = searchKeywords;
    }

    const updated = await db.material.update({
      where: { id },
      data,
      include: { attachments: true },
    });

    return NextResponse.json(serializeMaterial(updated));
  } catch (err) {
    console.error("[PUT /api/materials/[id]] error", err);
    return NextResponse.json(
      { error: "자료 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id]
 * 자료(및 첨부파일 cascade) 삭제
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 세션 + 권한 검증 (자료 삭제는 관리자·운영자만)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    if (!canManage(session.user.role)) {
      return NextResponse.json(
        { error: "자료를 삭제할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const existing = await db.material.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "자료를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Attachment 는 onDelete: Cascade 이므로 자동 삭제됨
    await db.material.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/materials/[id]] error", err);
    return NextResponse.json(
      { error: "자료 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
