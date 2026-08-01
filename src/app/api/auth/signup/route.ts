import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcrypt";
import { DEFAULT_ROLE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    // 필수값 검증
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "필수 항목을 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "유효한 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: "비밀번호는 6자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 이미 존재하는 이메일 확인
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await hash(password, 10);

    // 사용자 생성
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: DEFAULT_ROLE,
      },
    });

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/signup] error", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
