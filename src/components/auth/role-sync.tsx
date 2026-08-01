"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRoleStore } from "@/hooks/use-role";
import { normalizeRole } from "@/lib/constants";

/**
 * 로그인 세션의 role 을 전역 권한 store 로 동기화한다.
 * - 세션 role 을 신규 3단계(관리자/운영자/일반)로 정규화해 반영
 * - 비로그인/로딩 중에는 최소 권한("일반")으로 유지
 * 렌더링 출력은 없음 (부수효과 전용).
 */
export function RoleSync() {
  const { data: session, status } = useSession();
  const setRole = useRoleStore((s) => s.setRole);

  useEffect(() => {
    if (status === "authenticated") {
      setRole(normalizeRole(session?.user?.role));
    } else if (status === "unauthenticated") {
      setRole("일반");
    }
  }, [status, session?.user?.role, setRole]);

  return null;
}
