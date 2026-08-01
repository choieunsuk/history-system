import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 공개 라우트 (비로그인 접근 허용)
const publicRoutes = ["/login", "/signup", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 세션 쿠키 확인 (next-auth 자동 생성)
  const sessionToken = request.cookies.get("next-auth.session-token")?.value
    || request.cookies.get("__Secure-next-auth.session-token")?.value;
  const isAuthenticated = !!sessionToken;

  // API 라우트는 통과 (각 라우트 핸들러에서 세션·권한 검증)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 공개 라우트 통과
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 그 외 모든 페이지는 로그인 필수 (/admin 등 포함).
  // 관리자 전용(/admin) 세부 권한은 서버 컴포넌트에서 role 로 재검증.
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
