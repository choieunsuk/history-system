"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import type { RoleValue } from "@/lib/constants";

interface RoleState {
  role: RoleValue;
  setRole: (role: RoleValue) => void;
}

/**
 * 전역 권한 상태를 관리하는 zustand store.
 * 데모 환경에서 헤더의 권한 전환 드롭다운으로 변경됨.
 * 기본값은 "교역자"로, 모든 기능(등록/수정/삭제/비공개 조회)을 바로 확인할 수 있도록 함.
 */
export const useRoleStore = create<RoleState>((set) => ({
  role: "교역자",
  setRole: (role) => set({ role }),
}));

/**
 * 클라이언트 마운트 여부를 반환 (hydration-safe).
 * useSyncExternalStore로 SSR/클라이언트 일관성 보장.
 * - 서버 렌더링: false
 * - 클라이언트 첫 페인트 후: true
 * 현재 날짜/시간 기반 렌더링 시 hydration mismatch 방지용.
 */
const emptySubscribe = () => () => {};
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // 클라이언트 스냅샷
    () => false // 서버 스냅샷
  );
}
