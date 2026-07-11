// 역사자료부 자료이관 시스템 - 파일 업로드 API
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  ALLOWED_FILE_EXTENSIONS,
  BLOCKED_FILE_EXTENSIONS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * POST /api/upload
 * multipart/form-data, field name: file
 * 응답: { url, fileName, fileType, fileSize }
 */
export async function POST(request: NextRequest) {
  try {
    // 1) 요청 본문 크기 사전 검사 (Content-Length 기반)
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_FILE_SIZE + 1024) {
      // multipart 오버헤드 고려 여유분
      return NextResponse.json(
        {
          error: `파일 크기가 50MB 제한을 초과합니다. (전송 크기: ${(contentLength / 1024 / 1024).toFixed(1)}MB)`,
        },
        { status: 413 }
      );
    }

    // 2) formData 파싱 — Next.js 기본 제한(1MB) 회피를 위해 request.formData() 사용
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: `파일 데이터를 읽지 못했습니다. multipart/form-data 형식으로 file 필드를 보내주세요. (${msg})`,
        },
        { status: 400 }
      );
    }
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file 필드가 누락되었습니다. 파일을 다시 선택해 주세요." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "빈 파일(0 byte)은 업로드할 수 없습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `파일 크기는 50MB 이하여야 합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        },
        { status: 413 }
      );
    }

    const originalName = file.name || "upload.bin";
    const ext = path.extname(originalName).toLowerCase();

    // 3) 보안상 차단할 실행 파일 확장자 우선 검사
    if (BLOCKED_FILE_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `보안상 실행 파일(${ext})은 업로드할 수 없습니다.`,
        },
        { status: 400 }
      );
    }

    // 4) 허용 확장자 화이트리스트 검사
    if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `허용되지 않은 확장자입니다: "${ext || "확장자 없음"}"`,
          hint: `허용 확장자: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
          fileName: originalName,
        },
        { status: 400 }
      );
    }

    // 5) 업로드 디렉토리 보증
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const uuid = crypto.randomUUID();
    const storedName = `${uuid}${ext}`;
    const storedPath = path.join(UPLOAD_DIR, storedName);

    // 6) 파일 저장
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(storedPath, buffer);

    // 7) 저장 확인 (디스크 동기화 검증)
    const stat = await fs.stat(storedPath).catch(() => null);
    if (!stat || stat.size !== buffer.length) {
      await fs.unlink(storedPath).catch(() => {});
      return NextResponse.json(
        { error: "파일 저장 검증에 실패했습니다. 디스크 용량을 확인해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        url: `/uploads/${storedName}`,
        fileName: originalName,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/upload] error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "파일 업로드 중 오류가 발생했습니다.",
        detail: msg,
      },
      { status: 500 }
    );
  }
}
