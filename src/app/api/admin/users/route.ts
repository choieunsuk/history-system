// 역사자료부 자료이관 시스템 - 사용자 관리 API (관리자 전용)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/api-helpers";
import { normalizeRole } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/users
 * 전체 사용자 목록 (관리자만). 권한 관리 화면용.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      role: normalizeRole(u.role),
      createdAt: u.createdAt.toISOString(),
      // 본인 계정 여부 (자기 권한 강등 방지 UI 용)
      isSelf: u.id === session.user.id,
    })),
    currentUserId: session.user.id,
  });
}
