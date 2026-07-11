// 역사자료부 자료이관 시스템 - 파일 업로드 API
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ALLOWED_FILE_EXTENSIONS } from "@/lib/constants";

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
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "multipart/form-data 형식의 file 필드가 필요합니다." },
        { status: 400 }
      );
    }
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "빈 파일은 업로드할 수 없습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기는 50MB 를 초과할 수 없습니다. (전송: ${file.size} bytes)` },
        { status: 413 }
      );
    }

    const originalName = file.name || "upload.bin";
    const ext = path.extname(originalName).toLowerCase();
    if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `허용되지 않은 파일 확장자입니다. (${ext || "없음"}) 허용: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 업로드 디렉토리 보증
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const uuid = crypto.randomUUID();
    const storedName = `${uuid}${ext}`;
    const storedPath = path.join(UPLOAD_DIR, storedName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(storedPath, buffer);

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
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
