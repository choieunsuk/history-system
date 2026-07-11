// 역사자료부 자료이관 시스템 - 코드 옵션 API
import { NextResponse } from "next/server";
import {
  CLASSIFICATIONS,
  MATERIAL_CHARACTERS,
  PUBLIC_OPTIONS,
  ROLES,
} from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/code-options
 * 자료 분류/성격/공개여부/권한 코드 목록 반환
 */
export async function GET() {
  return NextResponse.json({
    classifications: CLASSIFICATIONS,
    characters: MATERIAL_CHARACTERS,
    publicOptions: PUBLIC_OPTIONS,
    roles: ROLES,
  });
}
