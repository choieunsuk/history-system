// 역사자료부 자료이관 시스템 - 관리자 비밀번호 초기화 API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/api-helpers";
import { hash } from "bcrypt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/admin/users/[id]/password
 * 관리자가 특정 사용자의 비밀번호를 재설정 (현재 비밀번호 불필요).
 * body: { newPassword }
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
  const body = await request.json().catch(() => null);
  const newPassword = body?.newPassword;

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json(
      { error: "새 비밀번호는 6자 이상이어야 합니다." },
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

  await db.user.update({
    where: { id },
    data: { password: await hash(newPassword, 10) },
  });

  return NextResponse.json({ success: true });
}
