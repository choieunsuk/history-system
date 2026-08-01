// 역사자료부 자료이관 시스템 - 본인 비밀번호 변경 API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcrypt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/account/password
 * 로그인한 본인의 비밀번호 변경. 현재 비밀번호 확인 필요.
 * body: { currentPassword, newPassword }
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(
      { error: "현재 비밀번호와 새 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "새 비밀번호는 6자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  // 소셜 로그인 등으로 비밀번호가 없는 계정
  if (!user.password) {
    return NextResponse.json(
      { error: "비밀번호가 설정되지 않은 계정입니다. (소셜 로그인)" },
      { status: 400 }
    );
  }

  const valid = await compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "현재 비밀번호가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  if (await compare(newPassword, user.password)) {
    return NextResponse.json(
      { error: "새 비밀번호가 현재 비밀번호와 동일합니다." },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { password: await hash(newPassword, 10) },
  });

  return NextResponse.json({ success: true });
}
