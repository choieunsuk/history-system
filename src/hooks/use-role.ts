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
 * 로그인 세션의 role 이 단일 기준이며, <RoleSync> 가 세션 → store 로 동기화한다.
 * 기본값은 최소 권한("일반") — 세션 로딩 전/비로그인 시 안전한 상태.
 */
export const useRoleStore = create<RoleState>((set) => ({
  role: "일반",
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
