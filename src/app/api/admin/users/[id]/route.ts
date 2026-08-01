// 역사자료부 자료이관 시스템 - 사용자 권한 변경 API (관리자 전용)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/api-helpers";
import { ROLES, type RoleValue } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ROLES = ROLES.map((r) => r.value) as readonly string[];

/**
 * PATCH /api/admin/users/[id]
 * 특정 사용자의 권한(role) 변경 (관리자만).
 * - 본인 권한은 변경 불가 (마지막 관리자 자기강등으로 인한 잠금 방지)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "본인의 권한은 변경할 수 없습니다." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `유효하지 않은 권한입니다. (${VALID_ROLES.join(", ")})` },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const updated = await db.user.update({
    where: { id },
    data: { role: role as RoleValue },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(updated);
}
