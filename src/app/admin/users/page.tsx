// 역사자료부 자료이관 시스템 - 사용자 관리 (관리자 전용 페이지)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/api-helpers";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();

  // 비로그인 → 로그인, 로그인했지만 관리자 아님 → 홈으로
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/users");
  }
  if (!isAdmin(session.user.role)) {
    redirect("/");
  }

  return <UsersClient />;
}
